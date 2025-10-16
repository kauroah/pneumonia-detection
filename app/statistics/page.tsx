"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Activity, Users, TrendingUp, Calendar, Loader2 } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<any>(null)            // summary (stable)
  const [trendWithSeverity, setTrendWithSeverity] = useState<any[]>([]) // charts data
  const [chartsLoading, setChartsLoading] = useState(false)          // only charts
  const [days, setDays] = useState(30)
  const router = useRouter()
  const abortRef = useRef<AbortController | null>(null)

  // 1) Fetch summary once (no days dependency)
  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch(`/api/statistics?days=${30}`) // or call /api/statistics/summary if you split backend
        if (!r.ok) throw new Error("Failed to fetch statistics")
        const data = await r.json()
        setStatistics(data.statistics)
        setTrendWithSeverity(data.trendWithSeverity) // initial
      } catch (e) {
        console.error("Failed to fetch initial statistics:", e)
      }
    }
    run()
  }, [])

  // 2) Only refetch charts when days changes
  useEffect(() => {
    if (!statistics) return // wait until summary is loaded
    setChartsLoading(true)

    // cancel previous in-flight fetch
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const run = async () => {
      try {
        const r = await fetch(`/api/statistics?days=${days}`, { signal: controller.signal })
        if (!r.ok) throw new Error("Failed to fetch trend")
        const data = await r.json()
        setTrendWithSeverity(data.trendWithSeverity)
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("Failed to fetch trend:", e)
        }
      } finally {
        if (!controller.signal.aborted) setChartsLoading(false)
      }
    }
    run()

    return () => controller.abort()
  }, [days, statistics])

  if (!statistics) {
    // Only for the very first load of the summary
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const detectionRate =
    statistics.totalAnalyses > 0 ? ((statistics.pneumoniaDetected / statistics.totalAnalyses) * 100).toFixed(1) : 0

  // Aggregate severities as fallback if backend didn’t send precomputed totals
  const totals = trendWithSeverity.reduce(
    (acc, d) => {
      acc.normal += Number(d?.normal || 0)
      acc.mild += Number(d?.mild || 0)
      acc.moderate += Number(d?.moderate || 0)
      acc.severe += Number(d?.severe || 0)
      return acc
    },
    { normal: 0, mild: 0, moderate: 0, severe: 0 }
  )

  const normalTotal = statistics.normalCases ?? totals.normal
  const mildTotal = statistics.pneumoniaMild ?? totals.mild
  const moderateTotal = statistics.pneumoniaModerate ?? totals.moderate
  const severeTotal = statistics.pneumoniaSevere ?? totals.severe

  // Grouped bars: Норма + три колонки тяжести
  const diagnosesData = [
    { name: "Норма", normal: normalTotal, mild: 0, moderate: 0, severe: 0 },
    { name: "Пневмония", normal: 0, mild: mildTotal, moderate: moderateTotal, severe: severeTotal },
  ]

  // Small overlay loader for charts (non-blocking)
  const ChartOverlay = () =>
    chartsLoading ? (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="rounded-md bg-background/70 px-2 py-1 text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Обновление графиков…
        </div>
      </div>
    ) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Статистика и аналитика</h1>
              <p className="text-xs text-muted-foreground">Обзор диагностической деятельности</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant={days === 7 ? "default" : "outline"} size="sm" onClick={() => setDays(7)}>
              7 дней
            </Button>
            <Button variant={days === 30 ? "default" : "outline"} size="sm" onClick={() => setDays(30)}>
              30 дней
            </Button>
            <Button variant={days === 90 ? "default" : "outline"} size="sm" onClick={() => setDays(90)}>
              90 дней
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Key Metrics (static while charts revalidate) */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего пациентов</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalPatients}</div>
              <p className="text-xs text-muted-foreground">Зарегистрировано в системе</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего анализов</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalAnalyses}</div>
              <p className="text-xs text-muted-foreground">За все время</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Выявлено пневмонии</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.pneumoniaDetected}</div>
              <p className="text-xs text-muted-foreground">{detectionRate}% от всех анализов</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">За этот месяц</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.analysesThisMonth}</div>
              <p className="text-xs text-muted-foreground">{statistics.analysesThisWeek} за эту неделю</p>
            </CardContent>
          </Card>
        </div>

        {/* Динамика диагностических случаев (норма + степени пневмонии) */}
        <Card className="relative">
          <CardHeader>
            <CardTitle>Динамика диагностических случаев</CardTitle>
            <CardDescription>Изменение количества нормальных и пневмонических случаев</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trendWithSeverity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="normal" name="Норма" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="mild" name="Лёгкая" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="moderate" name="Средняя" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="severe" name="Тяжёлая" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
              <ChartOverlay />
            </div>
          </CardContent>
        </Card>

        {/* Динамика пневмонии по степени тяжести (только степени) */}
        <Card className="relative">
          <CardHeader>
            <CardTitle>Динамика пневмонии по степени тяжести</CardTitle>
            <CardDescription>Распределение случаев пневмонии по степеням тяжести</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trendWithSeverity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="mild" stroke="#10b981" name="Лёгкая" strokeWidth={2} />
                  <Line type="monotone" dataKey="moderate" stroke="#f59e0b" name="Средняя" strokeWidth={2} />
                  <Line type="monotone" dataKey="severe" stroke="#ef4444" name="Тяжёлая" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              <ChartOverlay />
            </div>
          </CardContent>
        </Card>

        {/* Динамика диагностики: Пневмония vs Норма */}
        <Card className="relative">
          <CardHeader>
            <CardTitle>Динамика диагностики</CardTitle>
            <CardDescription>Сравнение случаев пневмонии и нормы</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trendWithSeverity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pneumonia" stroke="#ef4444" name="Пневмония" strokeWidth={2} />
                  <Line type="monotone" dataKey="normal" stroke="#3b82f6" name="Норма" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              <ChartOverlay />
            </div>
          </CardContent>
        </Card>

        {/* Распределение диагнозов — группированные колонки */}
        <Card className="relative">
          <CardHeader>
            <CardTitle>Распределение диагнозов</CardTitle>
            <CardDescription>Соотношение выявленных случаев пневмонии и нормы</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={diagnosesData} barCategoryGap="35%" barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="normal"   name="Норма"                fill="#3b82f6" />
                  <Bar dataKey="mild"     name="Пневмония — лёгкая"  fill="#10b981" />
                  <Bar dataKey="moderate" name="Пневмония — средняя" fill="#f59e0b" />
                  <Bar dataKey="severe"   name="Пневмония — тяжёлая" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
              <ChartOverlay />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
