import type {ProjectIssue} from "../domain/project";
import type {Locale} from "../i18n/messages";

const ISSUE_MESSAGES: Record<string, [string, string]> = {
  "project.invalid": ["项目数据无法读取。", "The project data could not be read."],
  "project.unsupported_version": ["该项目文件版本暂不支持。", "This project file version is not supported."],
  "project.name_required": ["请输入项目名称。", "Enter a project name."],
  "project.name_too_long": ["项目名称不能超过 200 个字符。", "The project name must be 200 characters or fewer."],
  "project.narration_too_long": ["朗读内容过长，请精简单词或释义。", "The narration is too long. Shorten the words or meanings."],
  "project.document_too_large": ["项目文件不能超过 256 KB。", "The project file must be 256 KB or smaller."],
  "canvas.invalid_preset": ["请选择支持的输出比例。", "Select a supported output ratio."],
  "background.invalid": ["背景视频设置不完整。", "The background video settings are incomplete."],
  "background.invalid_fit": ["背景视频填充方式无效。", "The background video fit setting is invalid."],
  "background.invalid_loop": ["背景视频循环设置无效。", "The background video loop setting is invalid."],
  "background.invalid_start": ["背景视频起始时间必须大于或等于 0。", "The background video start time must be 0 or greater."],
  "background.invalid_audio": ["背景视频原声设置无效。", "The background video audio setting is invalid."],
  "background.invalid_volume": ["背景视频原声音量无效。", "The background video source volume is invalid."],
  "music.invalid": ["背景音乐设置不完整。", "The background music settings are incomplete."],
  "music.invalid_volume": ["背景音乐音量无效。", "The background music volume is invalid."],
  "root.invalid": ["词根或词缀设置不完整。", "The root or affix settings are incomplete."],
  "root.text_required": ["请输入词根或词缀。", "Enter a root or affix."],
  "root.text_too_long": ["词根或词缀不能超过 1000 个字符。", "The root or affix must be 1,000 characters or fewer."],
  "root.meaning_required": ["请输入词根或词缀的中文含义。", "Enter the Chinese meaning for the root or affix."],
  "root.meaning_too_long": ["词根中文含义不能超过 1000 个字符。", "The root meaning must be 1,000 characters or fewer."],
  "root.invalid_position": ["中心位置设置无效。", "The center position is invalid."],
  "words.required": ["请至少添加一个单词。", "Add at least one word."],
  "words.too_many": ["关联单词最多可以添加 10 个。", "You can add up to 10 related words."],
  "layout.invalid": ["放射布局设置不完整。", "The radial layout settings are incomplete."],
  "layout.invalid_arrow_length": ["默认箭头长度无效。", "The default arrow length is invalid."],
  "layout.invalid_arrow_lengths": ["分组箭头长度设置无效。", "One or more grouped arrow lengths are invalid."],
  "layout.invalid_slot_order": ["单词排列顺序无效。", "The word order setting is invalid."],
  "title.invalid": ["标题样式设置不完整。", "The title style settings are incomplete."],
  "title.invalid_color": ["标题中存在无效颜色。", "A title color is invalid."],
  "style.invalid": ["画面样式设置不完整。", "The visual style settings are incomplete."],
  "style.invalid_number": ["画面样式中存在无效数值。", "A visual style value is invalid."],
  "style.invalid_string": ["画面样式中存在无效内容。", "A visual style value is invalid."],
  "style.invalid_color": ["画面样式中存在无效颜色。", "A visual style color is invalid."],
  "voice.invalid": ["朗读设置不完整。", "The narration settings are incomplete."],
  "voice.unsupported_provider": ["请选择支持的语音服务。", "Select a supported speech provider."],
  "voice.voice_required": ["请选择英文声音。", "Select an English voice."],
  "voice.invalid_voice": ["所选英文声音无效，请重新选择。", "The selected English voice is invalid. Select another voice."],
  "voice.chinese_voice_required": ["请选择中文声音。", "Select a Chinese voice."],
  "voice.invalid_chinese_voice": ["所选中文声音无效，请重新选择。", "The selected Chinese voice is invalid. Select another voice."],
  "voice.rate_required": ["请选择语速。", "Select a speech rate."],
  "voice.invalid_chinese_toggle": ["中文朗读设置无效。", "The Chinese narration setting is invalid."],
  "voice.invalid_break": ["词间停顿必须是 0 到 5000 毫秒。", "The gap between words must be between 0 and 5000 ms."],
  "asset.invalid": ["素材信息无效，请重新上传。", "The media reference is invalid. Upload the file again."],
  "asset.invalid_id": ["找不到已选素材，请重新上传。", "The selected media file could not be found. Upload it again."],
  "asset.invalid_name": ["素材文件名无效，请重新上传。", "The media file name is invalid. Upload the file again."],
  "asset.invalid_kind": ["素材类型不匹配，请重新上传。", "The media type does not match. Upload the correct file."],
};

const WORD_MESSAGES: Record<string, [(index: number) => string, (index: number) => string]> = {
  "word.invalid": [
    (index) => `第 ${index} 个单词的设置不完整。`,
    (index) => `The settings for word ${index} are incomplete.`,
  ],
  "word.text_required": [
    (index) => `第 ${index} 个单词的英文不能为空。`,
    (index) => `Enter the English text for word ${index}.`,
  ],
  "word.text_too_long": [
    (index) => `第 ${index} 个单词的英文不能超过 1000 个字符。`,
    (index) => `The English text for word ${index} must be 1,000 characters or fewer.`,
  ],
  "word.meaning_required": [
    (index) => `第 ${index} 个单词的中文含义不能为空。`,
    (index) => `Enter the Chinese meaning for word ${index}.`,
  ],
  "word.meaning_too_long": [
    (index) => `第 ${index} 个单词的中文含义不能超过 1000 个字符。`,
    (index) => `The Chinese meaning for word ${index} must be 1,000 characters or fewer.`,
  ],
  "word.invalid_direction": [
    (index) => `第 ${index} 个单词的方向无效。`,
    (index) => `The direction for word ${index} is invalid.`,
  ],
  "word.invalid_position": [
    (index) => `第 ${index} 个单词的位置无效。`,
    (index) => `The position for word ${index} is invalid.`,
  ],
  "word.invalid_arrow_point": [
    (index) => `第 ${index} 个单词的箭头位置无效。`,
    (index) => `The arrow position for word ${index} is invalid.`,
  ],
  "word.invalid_color": [
    (index) => `第 ${index} 个单词的颜色设置无效。`,
    (index) => `A color for word ${index} is invalid.`,
  ],
};

export function projectIssueText(issue: ProjectIssue, locale: Locale): string {
  const wordMessage = WORD_MESSAGES[issue.code];
  if (wordMessage) {
    const match = issue.path?.match(/^words\.(\d+)/);
    const index = match ? Number(match[1]) + 1 : 1;
    return wordMessage[locale === "zh-CN" ? 0 : 1](index);
  }

  const message = ISSUE_MESSAGES[issue.code];
  if (message) return message[locale === "zh-CN" ? 0 : 1];
  return locale === "zh-CN"
    ? "部分项目设置无效，请检查后重试。"
    : "Some project settings are invalid. Review them and try again.";
}
