import type {ProjectConfig, ProjectIssue} from "../../domain/project";
import {validateProject} from "../../domain/project";
import {createPreviewTimeline} from "../../domain/timeline";
import {useI18n} from "../../i18n/I18nProvider";
import {CheckIcon} from "../../ui/icons";
import type {RenderJobResponse} from "../../shared/api";
import {publicErrorText} from "../../app/error-messages";
import {projectIssueText} from "../../app/validation-messages";

export function OutputPanel({project, renderJob, onIssueSelect}: {project: ProjectConfig; renderJob: RenderJobResponse | null; onIssueSelect?: (issue: ProjectIssue) => void}) {
  const {locale, t} = useI18n();
  const validation = validateProject(project);
  const timeline = createPreviewTimeline(project);
  const ready = validation.ok;
  const issueCount = validation.errors.length;

  return (
    <>
      <div className="metric-grid">
        <div className="metric"><span>{t("output.resolution")}</span><strong>{project.canvas.width} × {project.canvas.height}</strong></div>
        <div className="metric"><span>{t("output.fps")}</span><strong>{project.canvas.fps} FPS</strong></div>
        <div className="metric"><span>{t("background.ratio")}</span><strong>{project.canvas.preset}</strong></div>
        <div className="metric"><span>{t("output.duration")}</span><strong>{timeline.totalSec.toFixed(1)} {t("output.seconds")}</strong></div>
      </div>
      <div className="output-card">
        <div className="output-card__row">
          <div className={`output-readiness ${ready ? "output-readiness--ready" : "output-readiness--error"}`}>
            {ready ? <CheckIcon /> : <span className="status-symbol" aria-hidden="true">!</span>}
            <strong>{ready ? t("output.ready") : t("output.notReady")}</strong>
          </div>
        </div>
        {ready && !project.background.asset ? <p className="output-advisory">{t("output.defaultBackground")}</p> : null}
      </div>
      {renderJob ? (
        <div className="render-job-card">
          <div className="render-job-card__header">
            <span>{t("output.job")}</span>
            <strong>{renderJob.id.slice(0, 8)}</strong>
          </div>
          <div className="render-progress"><span style={{width: `${Math.round(renderJob.progress * 100)}%`}} /></div>
          <div className="render-job-card__meta"><span>{stageText(renderJob.stage, locale)}</span><span>{Math.round(renderJob.progress * 100)}%</span></div>
          {renderJob.status === "failed" ? <p className="render-error">{publicErrorText(renderJob.errorCode ?? "render_failed", locale)}</p> : null}
          {renderJob.result ? (
            <div className="render-actions">
              <a className="button button--primary" href={renderJob.result.videoUrl} download>{t("output.download")}</a>
              <a className="button button--secondary" href={renderJob.result.posterUrl} download>{t("output.poster")}</a>
            </div>
          ) : null}
        </div>
      ) : null}
      {issueCount ? (
        <section className="validation-card" role="alert">
          <div className="validation-card__header">
            <span className="validation-card__symbol" aria-hidden="true">!</span>
            <div>
              <strong>{t("output.validationTitle")}</strong>
              <span>{t(issueCount === 1 ? "output.needsAttentionOne" : "output.needsAttentionMany", {count: issueCount})}</span>
            </div>
          </div>
          <ul className="validation-list">
            {validation.errors.map((error) => (
              <li key={`${error.code}-${error.path ?? ""}`}>
                {onIssueSelect ? (
                  <button className="validation-link" type="button" onClick={() => onIssueSelect(error)}>{projectIssueText(error, locale)}</button>
                ) : projectIssueText(error, locale)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function stageText(stage: string, locale: "zh-CN" | "en-US"): string {
  const labels: Record<string, [string, string]> = {
    queued: ["等待生成", "Queued"],
    speech: ["正在生成朗读", "Generating narration"],
    preparing: ["正在准备画面", "Preparing visuals"],
    rendering: ["正在渲染视频", "Rendering video"],
    complete: ["生成完成", "Complete"],
    failed: ["生成失败", "Failed"],
  };
  return labels[stage]?.[locale === "zh-CN" ? 0 : 1] ?? (locale === "zh-CN" ? "处理中" : "Processing");
}
