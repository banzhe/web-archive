import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@web-archive/shared/components/card'
import { Label, Pie, PieChart } from 'recharts'
import type { ChartConfig } from '@web-archive/shared/components/chart'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@web-archive/shared/components/chart'
import { useRequest } from 'ahooks'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ChartCardSkeleton from './common/chart-card-skeleton'
import { getPageChartData } from '~/data/data'

function TotalPieCard() {
  const { t } = useTranslation()
  const { data: pageChartData, loading } = useRequest(getPageChartData)
  const chartConfig = useMemo(() => {
    if (!pageChartData)
      return {}
    const config: ChartConfig = {}
    const data: { folder: string, count: number, fill: string }[] = []
    pageChartData.folders.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: `hsl(var(--chart-${index + 1}))`,
      }
      data.push({
        folder: item.name,
        count: item.pageCount,
        fill: `hsl(var(--chart-${index + 1}))`,
      })
    })
    return {
      config,
      data,
    }
  }, [pageChartData])

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{t('total-archived-pages')}</CardTitle>
        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig.config ?? {}}
          className="mx-auto aspect-square max-h-[250px]"
        >
          {loading
            ? <ChartCardSkeleton />
            : (
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={chartConfig.data}
                  dataKey="count"
                  nameKey="folder"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {pageChartData?.all}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Pages
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
              )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default TotalPieCard
