export type SupportedLocale = "zh-CN" | "en-US";

const MESSAGES: Record<string, [string, string]> = {
  tts_connected: ["Azure Speech 连接正常。", "Azure Speech is connected."],
  render_complete: ["视频生成完成。", "Video rendering is complete."],
  server_unavailable: ["本地服务未启动，请运行 pnpm dev。", "The local server is unavailable. Run pnpm dev."],
  session_unavailable: ["无法建立安全的本机会话，请重启应用。", "Could not establish a secure local session. Restart the app."],
  tts_not_configured: ["请先在环境变量中配置 Azure Speech。", "Configure Azure Speech in your environment first."],
  tts_authentication_failed: ["Azure Speech 凭据无效，请检查环境变量。", "Azure Speech credentials were rejected."],
  tts_auth_failed: ["Azure Speech 凭据无效，请检查环境变量。", "Azure Speech credentials were rejected."],
  tts_synthesis_failed: ["Azure Speech 生成失败，请稍后重试。", "Azure Speech synthesis failed. Try again."],
  tts_quota_exceeded: ["Azure Speech 额度不足或已达到限制。", "Azure Speech quota has been reached."],
  tts_timeout: ["Azure Speech 响应超时，请稍后重试。", "Azure Speech timed out. Try again."],
  tts_preview_timeout: ["试听超时，请重试。", "Speech preview timed out. Try again."],
  audio_playback_failed: ["音频无法播放，请重试或更换浏览器。", "The audio could not be played. Try again or use another browser."],
  tts_busy: ["语音任务较多，请稍后再试。", "Speech processing is busy. Try again shortly."],
  upload_too_large: ["文件超过大小限制。", "The file exceeds the upload limit."],
  unsupported_media_type: ["不支持这种文件格式。", "This file format is not supported."],
  invalid_media: ["无法识别该媒体文件，请更换文件。", "The media file could not be validated."],
  invalid_video: ["所选文件不包含有效视频。", "The selected file does not contain valid video."],
  invalid_audio: ["所选文件不包含有效音频。", "The selected file does not contain valid audio."],
  project_invalid: ["项目中有未填写或无效的内容。", "The project contains missing or invalid fields."],
  project_import_invalid: ["无法导入项目文件，请检查文件内容。", "Could not import the project. Check the file contents."],
  project_import_too_large: ["项目文件过大，请选择不超过 256 KB 的文件。", "The project file is too large. Select a file up to 256 KB."],
  request_too_large: ["提交内容过大，请精简后重试。", "The request is too large. Reduce its contents and try again."],
  render_queue_full: ["已有多个任务等待生成，请稍后再试。", "The render queue is full. Try again later."],
  render_timeout: ["视频生成等待超时，请重新尝试。", "Video rendering timed out. Try again."],
  render_failed: ["视频生成失败，请检查素材与语音设置。", "Video rendering failed. Check the media and voice settings."],
  request_failed: ["操作失败，请稍后重试。", "The request failed. Try again."],
};

export function publicErrorText(code: string, locale: SupportedLocale): string {
  return MESSAGES[code]?.[locale === "zh-CN" ? 0 : 1] ?? MESSAGES.request_failed[locale === "zh-CN" ? 0 : 1];
}
