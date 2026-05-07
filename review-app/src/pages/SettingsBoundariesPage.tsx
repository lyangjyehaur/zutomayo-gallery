import { Block, BlockTitle, Card, CardContent, CardHeader, List, ListItem, Navbar, Page } from 'framework7-react'
import { MODERATION_BOUNDARIES } from '../lib/moderation-boundaries'

export default function SettingsBoundariesPage() {
  return (
    <Page>
      <Navbar title="接管邊界" backLink="返回" />

      <Block strong inset>
        這裡集中查看各工作區在 `review-app` 與桌面 admin 之間的接管範圍、保留情境、限制與對應 API。
      </Block>

      <BlockTitle>總覽</BlockTitle>
      <List inset strong mediaList>
        {MODERATION_BOUNDARIES.map((item) => (
          <ListItem
            key={item.workspace}
            title={item.sourcePage}
            subtitle={`${item.sourceRoute} · ${item.ownership}`}
            text={item.notes}
          />
        ))}
      </List>

      <Block>
        {MODERATION_BOUNDARIES.map((item) => (
          <Card key={`${item.workspace}-details`}>
            <CardHeader>{item.sourcePage}</CardHeader>
            <CardContent>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{item.ownership}</div>
              <div style={{ opacity: 0.75, marginBottom: 12 }}>{item.sourceRoute}</div>

              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>已接管能力</div>
              <ul style={{ margin: '0 0 12px 18px', padding: 0 }}>
                {item.directCoverage.map((entry) => (
                  <li key={entry} style={{ marginBottom: 4 }}>{entry}</li>
                ))}
              </ul>

              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>保留桌面 admin 情境</div>
              {item.desktopFallbacks.length > 0 ? (
                <ul style={{ margin: '0 0 12px 18px', padding: 0 }}>
                  {item.desktopFallbacks.map((entry) => (
                    <li key={entry} style={{ marginBottom: 4 }}>{entry}</li>
                  ))}
                </ul>
              ) : (
                <div style={{ opacity: 0.75, marginBottom: 12 }}>
                  目前沒有明確未接管的核心功能；桌面 admin 主要保留作為大螢幕備援入口。
                </div>
              )}

              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>已知限制</div>
              <ul style={{ margin: '0 0 12px 18px', padding: 0 }}>
                {item.knownLimitations.map((entry) => (
                  <li key={entry} style={{ marginBottom: 4 }}>{entry}</li>
                ))}
              </ul>

              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>對應 API</div>
              <ul style={{ margin: '0 0 0 18px', padding: 0 }}>
                {item.apiScopes.map((scope) => (
                  <li key={scope} style={{ marginBottom: 4, wordBreak: 'break-all' }}>{scope}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </Block>
    </Page>
  )
}
