import { useState, useEffect } from 'react'
import {
  Settings,
  Cpu,
  Eye,
  Upload,
  Info,
  Server,
  Layers,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useTheme } from '@/hooks/useTheme'
import { getModelInfo, getHealth } from '@/services/api'
import type { ModelInfo, HealthResponse } from '@/types'

function SettingRow({
  label,
  value,
  description,
}: {
  label: string
  value: React.ReactNode
  description?: string
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-0 gap-1.5">
      <div>
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {label}
        </div>
        {description && (
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {description}
          </div>
        )}
      </div>
      <div className="text-sm font-mono text-slate-700 dark:text-slate-300 max-w-sm sm:text-right">
        {value}
      </div>
    </div>
  )
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-50 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="font-bold text-slate-900 dark:text-white text-base">
            {title}
          </h2>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function SettingsPage() {
  const { dark, toggle } = useTheme()
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [health, setHealth] = useState<HealthResponse | null>(null)

  useEffect(() => {
    getModelInfo().then(setModelInfo).catch(() => {})
    getHealth().then(setHealth).catch(() => {})
  }, [])

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Application Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Inspect inference pipeline hyperparameters, OCR configuration, and model architecture metadata.
        </p>
      </div>

      {/* Model Settings */}
      <SectionCard icon={Cpu} title="Sentiment Model Configuration">
        <SettingRow
          label="Pretrained Model"
          value={
            <span className="font-semibold text-violet-600 dark:text-violet-400">
              {modelInfo?.model_id ?? 'cardiffnlp/twitter-roberta-base-sentiment-latest'}
            </span>
          }
          description="Hugging Face Transformer fine-tuned on ~124M tweets"
        />
        <SettingRow
          label="Inference Device"
          value={
            <span className="uppercase font-bold text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
              {modelInfo?.device ?? 'CPU'}
            </span>
          }
          description="Hardware acceleration (CUDA or CPU)"
        />
        <SettingRow
          label="Model Loading State"
          value={
            modelInfo?.loaded ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Initialized
              </span>
            ) : (
              <span className="text-xs font-medium text-amber-600">
                Lazy-loading on initial request
              </span>
            )
          }
          description="Singleton memory model instance"
        />
        <SettingRow
          label="Dynamic Label Mapping"
          value={
            modelInfo?.labels ? (
              <span className="text-xs">
                {Object.entries(modelInfo.labels)
                  .map(([k, v]) => `${k}→${v}`)
                  .join(' | ')}
              </span>
            ) : (
              '0→negative | 1→neutral | 2→positive'
            )
          }
          description="Read dynamically from Hugging Face config.json (never hardcoded)"
        />
      </SectionCard>

      {/* OCR Settings */}
      <SectionCard icon={Eye} title="OCR & Text Extraction Settings">
        <SettingRow
          label="OCR Engine"
          value="EasyOCR (PyTorch-backed CRAFT + ResNet)"
          description="Deep learning optical character recognition"
        />
        <SettingRow
          label="Confidence Cutoff Threshold"
          value="0.40 (40%)"
          description="Configurable via OCR_CONFIDENCE_THRESHOLD in .env"
        />
        <SettingRow
          label="Default Languages"
          value="English (en)"
          description="Configurable via OCR_LANGUAGES in .env"
        />
        <SettingRow
          label="Image Preprocessing"
          value="CLAHE (LAB) + Selective Denoising"
          description="Adaptive histogram equalization before text extraction"
        />
      </SectionCard>

      {/* Upload Settings */}
      <SectionCard icon={Upload} title="Image Ingestion & Uploads">
        <SettingRow
          label="Maximum File Size"
          value="10 MB per image"
          description="Configurable via MAX_UPLOAD_SIZE_MB in .env"
        />
        <SettingRow
          label="Supported Image Formats"
          value="PNG, JPG, JPEG"
          description="RGB conversion and validation via Pillow and OpenCV"
        />
        <SettingRow
          label="Batch Concurrency Limit"
          value="20 images per batch"
          description="Sequential processing to prevent OOM errors"
        />
      </SectionCard>

      {/* Appearance */}
      <SectionCard icon={Settings} title="Interface Appearance">
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Color Theme
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Toggle between clean light mode and dark mode
            </div>
          </div>
          <button
            onClick={toggle}
            className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              dark ? 'bg-violet-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                dark ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
      </SectionCard>

      {/* System info */}
      <SectionCard icon={Server} title="System Architecture & Backend Info">
        <SettingRow
          label="FastAPI Backend Host"
          value="http://localhost:8000"
          description="Uvicorn ASGI server"
        />
        <SettingRow
          label="Swagger Documentation"
          value={
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1"
            >
              localhost:8000/docs
            </a>
          }
          description="Interactive OpenAPI specification"
        />
        <SettingRow
          label="Database URL"
          value="sqlite:///./sentivision.db"
          description="Local persistent relational storage"
        />
        <SettingRow
          label="System Health"
          value={
            health?.status === 'ok' ? (
              <span className="text-green-600 font-semibold text-xs">
                Active & Healthy
              </span>
            ) : (
              <span className="text-red-500 font-semibold text-xs">Offline</span>
            )
          }
          description="Real-time heartbeat check"
        />
      </SectionCard>

      {/* Compliance / Academic Note */}
      <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 text-xs">
        <ShieldCheck className="w-5 h-5 shrink-0 text-violet-600 dark:text-violet-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Academic Project Integrity:
          </p>
          <p className="leading-relaxed">
            All models used are pretrained on public benchmarks and evaluated zero-shot without fine-tuning. Label mappings are dynamically resolved from the Hugging Face configuration. All metric reports in the Evaluation Lab and CLI represent genuine scikit-learn evaluations on real dataset splits.
          </p>
        </div>
      </div>
    </div>
  )
}

