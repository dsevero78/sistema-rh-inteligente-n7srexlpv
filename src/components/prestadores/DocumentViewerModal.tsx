import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, Download, ExternalLink } from 'lucide-react'

interface DocumentViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  title: string
  filename?: string
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  open,
  onOpenChange,
  url,
  title,
  filename,
}) => {
  const [loadError, setLoadError] = useState(false)
  const isImage = filename ? /\.(png|jpe?g|webp|svg)$/i.test(filename) : false
  const isPdf = filename ? /\.pdf$/i.test(filename) : true

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6 bg-white border border-slate-200">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 pr-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="font-display text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {title || 'Visualizador de Documentos'}
              </DialogTitle>{' '}
              {filename && (
                <DialogDescription className="text-xs text-slate-500 font-mono">
                  {filename}
                </DialogDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noreferrer" download>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-slate-200 text-slate-700"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Baixar
              </Button>
            </a>
            <a href={url} target="_blank" rel="noreferrer">
              <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Abrir em Nova Aba
              </Button>
            </a>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-[450px] w-full bg-slate-100/70 rounded-lg overflow-hidden flex items-center justify-center p-2 mt-2">
          {loadError ? (
            <div className="text-center p-8">
              <p className="text-sm font-semibold text-slate-700">
                Não foi possível carregar a prévia diretamente.
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Clique no botão abaixo para abrir ou baixar o arquivo.
              </p>
              <a href={url} target="_blank" rel="noreferrer">
                <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                  Visualizar Arquivo Externo
                </Button>
              </a>
            </div>
          ) : isImage ? (
            <img
              src={url}
              alt={title}
              className="max-h-[70vh] max-w-full object-contain rounded shadow-xs"
              onError={() => setLoadError(true)}
            />
          ) : (
            <iframe
              src={url}
              title={title}
              className="w-full h-full min-h-[550px] rounded border border-slate-200 bg-white"
              onError={() => setLoadError(true)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
