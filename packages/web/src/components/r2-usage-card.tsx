import { Card, CardContent, CardHeader, CardTitle } from '@web-archive/shared/components/card'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import ChartCardSkeleton from './common/chart-card-skeleton'

const R2UsageCard = memo(({ loading, data }: { loading: boolean, data?: { count: number, size: number } }) => {
  const { t } = useTranslation()
  return loading
    ? <ChartCardSkeleton />
    : (
      <Card>
        <CardHeader>
          <CardTitle>{t('r2-usage')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <section>
              <span>{data?.count}</span>
              {' '}
              objects
            </section>
            <section>
              <span>{Math.round((data?.size ?? 0) / 1024 / 1024)}</span>
              {' '}
              MB
            </section>
          </div>
        </CardContent>
      </Card>
      )
})

export default R2UsageCard
