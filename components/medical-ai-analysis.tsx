"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Loader2, AlertCircle, History, Clock, Download, Printer, Copy, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createBrowserClient } from "@/lib/supabase/client"
import type { AIMedicalAnalysis } from "@/lib/db-types"

interface MedicalAIAnalysisProps {
  patientId: string
  hasRecords: boolean
}

export function MedicalAIAnalysis({ patientId, hasRecords }: MedicalAIAnalysisProps) {
  const [loading, setLoading] = useState(false)
  const [recommendation, setRecommendation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [riskLevel, setRiskLevel] = useState<string | null>(null)
  const [historicalAnalyses, setHistoricalAnalyses] = useState<AIMedicalAnalysis[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (hasRecords) {
      loadHistoricalAnalyses()
    }
  }, [patientId, hasRecords])

  const loadHistoricalAnalyses = async () => {
    setLoadingHistory(true)
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("ai_medical_analyses")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error
      setHistoricalAnalyses(data || [])
    } catch (err) {
      console.error("Error loading historical analyses:", err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const analyzeRecords = async () => {
    setLoading(true)
    setError(null)
    setRecommendation(null)

    try {
      const response = await fetch("/api/analyze-medical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to analyze medical records")
      }

      const data = await response.json()
      setRecommendation(data.recommendation)
      setRiskLevel(data.riskLevel)

      await loadHistoricalAnalyses()
    } catch (err) {
      console.error("Error analyzing records:", err)
      setError(err instanceof Error ? err.message : "Ошибка при анализе медицинских записей")
    } finally {
      setLoading(false)
    }
  }

  const getRiskBadgeVariant = (risk: string | null) => {
    switch (risk) {
      case "critical":
        return "destructive"
      case "high":
        return "destructive"
      case "moderate":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getRiskLabel = (risk: string | null) => {
    switch (risk) {
      case "critical":
        return "Критический"
      case "high":
        return "Высокий"
      case "moderate":
        return "Умеренный"
      case "low":
        return "Низкий"
      default:
        return "Не определен"
    }
  }

  const handlePrint = (text: string) => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>AI Медицинский Анализ</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.6;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: 'Courier New', monospace;
                font-size: 12px;
              }
              h1 {
                color: #2563eb;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 10px;
              }
              .header {
                margin-bottom: 30px;
              }
              .date {
                color: #666;
                font-size: 14px;
              }
              @media print {
                body { padding: 20px; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>AI Медицинский Анализ</h1>
              <p class="date">Дата: ${new Date().toLocaleString("ru-RU")}</p>
            </div>
            <pre>${text}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleDownloadPdf = (text: string, filename: string) => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>AI Медицинский Анализ</title>
            <meta charset="UTF-8">
            <style>
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 0;
                margin: 0;
                line-height: 1.6;
                font-size: 11pt;
              }
              .header {
                margin-bottom: 20px;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 10px;
              }
              h1 {
                color: #2563eb;
                margin: 0 0 10px 0;
                font-size: 20pt;
              }
              .date {
                color: #666;
                font-size: 10pt;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                font-family: 'Courier New', monospace;
                font-size: 10pt;
                line-height: 1.5;
                margin: 0;
              }
              .footer {
                margin-top: 30px;
                padding-top: 10px;
                border-top: 1px solid #ccc;
                font-size: 9pt;
                color: #666;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>AI Медицинский Анализ</h1>
              <p class="date">Дата создания: ${new Date().toLocaleString("ru-RU")}</p>
            </div>
            <pre>${text}</pre>
            <div class="footer">
              <p>Документ создан системой AI медицинского анализа</p>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <CardTitle>AI Анализ медицинской истории</CardTitle>
            <CardDescription>
              Искусственный интеллект проанализирует все медицинские записи и предоставит рекомендации
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasRecords && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Добавьте медицинские записи, чтобы получить AI анализ медицинской истории пациента.
            </AlertDescription>
          </Alert>
        )}

        {hasRecords && (
          <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">Новый анализ</TabsTrigger>
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-2" />
                История ({historicalAnalyses.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4">
              {!recommendation && (
                <Button onClick={analyzeRecords} disabled={loading} className="w-full" size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Анализ медицинской истории...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Анализировать медицинскую историю
                    </>
                  )}
                </Button>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {recommendation && (
                <div className="space-y-4">
                  {riskLevel && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Уровень риска:</span>
                      <Badge variant={getRiskBadgeVariant(riskLevel)}>{getRiskLabel(riskLevel)}</Badge>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => handlePrint(recommendation)} variant="outline" size="sm">
                      <Printer className="w-4 h-4 mr-2" />
                      Печать
                    </Button>
                    <Button
                      onClick={() =>
                        handleDownloadPdf(
                          recommendation,
                          `medical-analysis-${new Date().toISOString().split("T")[0]}.pdf`,
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Скачать PDF
                    </Button>
                    <Button onClick={() => handleCopyToClipboard(recommendation)} variant="outline" size="sm">
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Скопировано
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Копировать
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="bg-muted p-4 rounded-lg max-h-[600px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{recommendation}</pre>
                  </div>
                  <Button
                    onClick={analyzeRecords}
                    variant="outline"
                    disabled={loading}
                    className="w-full bg-transparent"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Повторный анализ...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Повторить анализ
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : historicalAnalyses.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>История анализов пуста. Создайте первый анализ.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {historicalAnalyses.map((analysis) => (
                    <Card key={analysis.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {new Date(analysis.created_at).toLocaleString("ru-RU")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                Записей проанализировано: {analysis.medical_records_count}
                              </span>
                              {analysis.risk_level && (
                                <Badge variant={getRiskBadgeVariant(analysis.risk_level)} className="text-xs">
                                  {getRiskLabel(analysis.risk_level)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <details className="cursor-pointer">
                          <summary className="text-sm font-medium mb-2">Показать анализ</summary>
                          <div className="space-y-2">
                            <div className="flex gap-2 flex-wrap mt-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePrint(analysis.analysis_text)
                                }}
                                variant="outline"
                                size="sm"
                              >
                                <Printer className="w-3 h-3 mr-1" />
                                Печать
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownloadPdf(
                                    analysis.analysis_text,
                                    `medical-analysis-${new Date(analysis.created_at).toISOString().split("T")[0]}.pdf`,
                                  )
                                }}
                                variant="outline"
                                size="sm"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Скачать PDF
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopyToClipboard(analysis.analysis_text)
                                }}
                                variant="outline"
                                size="sm"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Копировать
                              </Button>
                            </div>
                            <div className="bg-muted p-3 rounded-lg mt-2 max-h-[400px] overflow-y-auto">
                              <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed">
                                {analysis.analysis_text}
                              </pre>
                            </div>
                          </div>
                        </details>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
