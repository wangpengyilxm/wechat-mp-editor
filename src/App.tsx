import { useCallback, useEffect, useState } from "react";

import { BottomPanel } from "./components/BottomPanel";

import { LeftPanel } from "./components/LeftPanel";

import { PreviewPanel } from "./components/PreviewPanel";

import { DEFAULT_PROMPTS } from "./config/defaultPrompts";

import {
  getArticleWorkflowSteps,
  getFormatWorkflowSteps,
  getWorkflowSteps,
  TOPIC_FISSION_STEP,
} from "./config/workflowSteps";

import type {
  BottomTab,
  GenConfig,
  HistoryItem,
  WorkMode,
  WorkflowErrorInfo,
  WorkflowStatusMap,
} from "./types";

import {
  clearAllAppStorage,
  loadStoredConfig,
  loadPreferences,
  normalizeGenConfig,
  saveHistory as persistHistory,
  savePreferences,
  saveStoredConfig,
} from "./utils/configStorage";

import { useGenConfig } from "./hooks/useGenConfig";

import { runArticlePipeline } from "./services/articlePipeline";

import { generateTopicTitles } from "./services/topicFission";
import { syncToWechatDraft } from "./services/wechatMpSync";

import { createIdleWorkflowStatus } from "./utils/workflowRunner";
import { formatWorkflowError } from "./utils/workflowError";

const DEFAULT_CONFIG: GenConfig = {
  textModel: {
    vendor: "",
    name: "",
    endpoint: "",
    apiKey: "",
  },

  imageModel: {
    vendor: "",
    name: "",
    endpoint: "",
    apiKey: "",
  },

  mpAccount: { appId: "", appSecret: "" },

  prompts: DEFAULT_PROMPTS,
};

const STORAGE_RESET_FLAG = "wechat-mp-editor:storage-reset-v1";

function createInitialConfig(): GenConfig {
  try {
    if (!sessionStorage.getItem(STORAGE_RESET_FLAG)) {
      clearAllAppStorage();
      sessionStorage.setItem(STORAGE_RESET_FLAG, "1");
      return normalizeGenConfig(DEFAULT_CONFIG);
    }
  } catch {
    clearAllAppStorage();
  }
  return loadStoredConfig(DEFAULT_CONFIG);
}

export default function App() {
  const [mode, setMode] = useState<WorkMode>("theme");

  const [bottomTab, setBottomTab] = useState<BottomTab>("workflow");

  const [theme, setTheme] = useState("");

  const [title, setTitle] = useState("");

  const [body, setBody] = useState("");

  const [draftBody, setDraftBody] = useState("");

  const [finalHtml, setFinalHtml] = useState("");

  const [config, setConfig] = useState<GenConfig>(createInitialConfig);

  const handleConfigChange = useCallback((next: GenConfig) => {
    const normalized = normalizeGenConfig(next);

    setConfig(normalized);

    saveStoredConfig(normalized);
  }, []);

  const handleConfigPatch = useCallback((patch: Partial<GenConfig>) => {
    setConfig((prev) => {
      const next = normalizeGenConfig({ ...prev, ...patch });

      saveStoredConfig(next);

      return next;
    });
  }, []);

  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);

  const [isFormatting, setIsFormatting] = useState(false);

  const [fissionTitles, setFissionTitles] = useState<string[]>([]);

  const [fissionError, setFissionError] = useState<string | null>(null);

  const [syncingDraft, setSyncingDraft] = useState(false);

  const [generatingArticleTitle, setGeneratingArticleTitle] = useState<
    string | null
  >(null);

  const [imageEnabled, setImageEnabled] = useState(
    () => loadPreferences({ imageEnabled: false }).imageEnabled,
  );

  const handleImageEnabledChange = useCallback((enabled: boolean) => {
    setImageEnabled(enabled);

    savePreferences({ imageEnabled: enabled });
  }, []);

  const { getRuntime } = useGenConfig(config, imageEnabled);

  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatusMap>({});

  const [workflowError, setWorkflowError] = useState<WorkflowErrorInfo | null>(
    null,
  );

  const reportPipelineError = useCallback((step: string, err: unknown) => {
    const info = formatWorkflowError(step, err);
    setWorkflowError(info);
    setFissionError(`【${info.step}】${info.message}`);
  }, []);

  useEffect(() => {
    setWorkflowStatus(createIdleWorkflowStatus(getWorkflowSteps(imageEnabled)));
  }, [imageEnabled]);

  useEffect(() => {
    persistHistory(history);
  }, [history]);

  const plainTextPreview =
    draftBody.trim() || body.trim()
      ? [title.trim(), (draftBody || body).trim()].filter(Boolean).join("\n\n")
      : "";

  const saveHistoryRecord = useCallback((record: HistoryItem) => {
    setHistory((prev) =>
      [record, ...prev.filter((h) => h.id !== record.id)].slice(0, 20),
    );
  }, []);

  const handleGenerateFromTheme = async () => {
    const allSteps = getWorkflowSteps(imageEnabled);

    setWorkflowStatus(createIdleWorkflowStatus(allSteps));

    setBottomTab("workflow");

    setIsGenerating(true);

    setFissionError(null);

    setWorkflowError(null);

    setFissionTitles([]);

    setTitle("");

    setBody("");

    setDraftBody("");

    setFinalHtml("");

    try {
      setWorkflowStatus((prev) => ({
        ...prev,

        [TOPIC_FISSION_STEP]: "running",
      }));

      const titles = await generateTopicTitles(theme, getRuntime());

      setFissionTitles(titles);

      setWorkflowStatus((prev) => ({
        ...prev,

        [TOPIC_FISSION_STEP]: "completed",
      }));
    } catch (err) {
      setWorkflowStatus((prev) => ({
        ...prev,

        [TOPIC_FISSION_STEP]: "error",
      }));

      reportPipelineError(
        TOPIC_FISSION_STEP,
        err instanceof Error ? err : new Error("标题裂变失败，请稍后重试"),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateArticle = async (articleTitle: string) => {
    setGeneratingArticleTitle(articleTitle);

    setTitle(articleTitle);

    setFissionError(null);

    setWorkflowError(null);

    setBottomTab("workflow");

    const articleSteps = getArticleWorkflowSteps(imageEnabled);

    setWorkflowStatus(createIdleWorkflowStatus(getWorkflowSteps(imageEnabled)));

    setWorkflowStatus((prev) => ({
      ...prev,

      [TOPIC_FISSION_STEP]: "completed",
    }));

    setDraftBody("");
    setBody("");
    setFinalHtml("");

    try {
      const result = await runArticlePipeline({
        theme,

        articleTitle,

        runtime: getRuntime(),

        onDraftReady: ({ draftBody: draft }) => {
          setDraftBody(draft);
        },

        onStep: (step, status) => {
          if (articleSteps.includes(step)) {
            setWorkflowStatus((prev) => ({ ...prev, [step]: status }));
          }
        },

        onStepError: (step, err) => {
          reportPipelineError(step, err);
        },
      });

      setDraftBody(result.draftBody);

      setBody(result.markedBody);

      setFinalHtml(result.finalHtml);

      if (result.imageGenWarnings.length > 0) {
        setFissionError(
          `配图部分成功：${result.imageUrls.filter(Boolean).length}/3 张已生成。${result.imageGenWarnings.join("；")}`,
        );
      }

      saveHistoryRecord(result.historyRecord);
    } catch {
      // 步骤错误已由 onStepError 写入 workflowError
    } finally {
      setGeneratingArticleTitle(null);
    }
  };

  const handleFormat = async () => {
    if (!body.trim()) {
      setFissionError("请先输入正文");

      return;
    }

    setIsFormatting(true);

    setFissionError(null);

    setWorkflowError(null);

    setBottomTab("workflow");

    const formatSteps = getFormatWorkflowSteps();

    setWorkflowStatus(createIdleWorkflowStatus(formatSteps));

    try {
      const result = await runArticlePipeline({
        theme: theme || title,

        articleTitle: title || "未命名文章",

        runtime: getRuntime(),

        skipDraft: true,

        existingDraft: body,

        onStep: (step, status) => {
          setWorkflowStatus((prev) => ({ ...prev, [step]: status }));
        },

        onStepError: (step, err) => {
          reportPipelineError(step, err);
        },
      });

      setDraftBody(result.draftBody);

      setBody(result.markedBody);

      setFinalHtml(result.finalHtml);

      saveHistoryRecord({ ...result.historyRecord, mode: "direct" });
    } catch {
      // 步骤错误已由 onStepError 写入 workflowError
    } finally {
      setIsFormatting(false);
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setTitle(item.title);

    setMode(item.mode);

    setTheme(item.theme ?? "");

    setDraftBody(item.draftBody ?? "");

    setBody(item.markedBody ?? item.draftBody ?? "");

    setFinalHtml(item.finalHtml ?? "");
  };

  return (
    <div className="flex h-full gap-2 p-2">
      <div className="flex w-1/3 min-w-[320px] max-w-[480px] shrink-0 flex-col neo-card overflow-hidden">
        <LeftPanel
          mode={mode}
          onModeChange={setMode}
          theme={theme}
          onThemeChange={setTheme}
          title={title}
          onTitleChange={setTitle}
          body={body}
          onBodyChange={setBody}
          isGenerating={isGenerating}
          isFormatting={isFormatting}
          onGenerateFromTheme={handleGenerateFromTheme}
          onFormat={handleFormat}
          imageEnabled={imageEnabled}
          onImageEnabledChange={handleImageEnabledChange}
          fissionTitles={fissionTitles}
          fissionError={fissionError}
          generatingArticleTitle={generatingArticleTitle}
          onGenerateArticle={handleGenerateArticle}
        />

        <BottomPanel
          activeTab={bottomTab}
          onTabChange={setBottomTab}
          config={config}
          onConfigChange={handleConfigChange}
          onConfigPatch={handleConfigPatch}
          history={history}
          onLoadHistory={handleLoadHistory}
          imageEnabled={imageEnabled}
          workflowStatus={workflowStatus}
          workflowError={workflowError}
        />
      </div>

      <PreviewPanel
        plainText={plainTextPreview}
        formattedHtml={finalHtml}
        isDraftLoading={Boolean(generatingArticleTitle) && !draftBody.trim()}
        showLayoutPending={
          Boolean(generatingArticleTitle) &&
          Boolean(draftBody.trim()) &&
          !finalHtml
        }
        isSyncingDraft={syncingDraft}
        onSyncDraft={() => {
          if (!finalHtml || syncingDraft) return;

          const { appId, appSecret } = config.mpAccount;
          if (!appId.trim() || !appSecret.trim()) {
            window.alert(
              "请先在「设置 → 公众号链接」中填写 AppID 与 AppSecret 并保存。",
            );
            setBottomTab("config");
            return;
          }

          const articleTitle = title.trim() || theme.trim() || "未命名文章";

          void (async () => {
            setSyncingDraft(true);
            try {
              const { draftMediaId } = await syncToWechatDraft({
                appId: appId.trim(),
                appSecret: appSecret.trim(),
                title: articleTitle,
                html: finalHtml,
                author: "王哥",
              });
              window.alert(
                `已同步至公众号草稿箱。\n可在微信公众平台 → 内容与互动 → 草稿箱 中查看。\n草稿 media_id：${draftMediaId}`,
              );
            } catch (err) {
              window.alert(
                err instanceof Error ? err.message : "同步至草稿箱失败",
              );
            } finally {
              setSyncingDraft(false);
            }
          })();
        }}
      />
    </div>
  );
}
