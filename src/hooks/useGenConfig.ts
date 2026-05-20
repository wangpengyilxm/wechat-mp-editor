import { useCallback, useEffect, useRef } from 'react'
import type { GenConfig } from '../types'
import { buildGenRuntime, type GenRuntime } from '../utils/genRuntime'

/** 始终返回当前已保存的配置，避免点击生成时用到旧模型 */
export function useGenConfig(config: GenConfig, imageEnabled: boolean) {
  const configRef = useRef(config)
  const imageEnabledRef = useRef(imageEnabled)

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    imageEnabledRef.current = imageEnabled
  }, [imageEnabled])

  const getRuntime = useCallback((): GenRuntime => {
    return buildGenRuntime(configRef.current, imageEnabledRef.current)
  }, [])

  return { getRuntime, configRef }
}
