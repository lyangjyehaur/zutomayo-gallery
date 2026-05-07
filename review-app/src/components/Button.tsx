import type { ComponentProps } from 'react'
import { Button as F7Button } from 'framework7-react'

type ButtonProps = ComponentProps<typeof F7Button>

export default function Button(props: ButtonProps) {
  return <F7Button roundIos roundMd={false} {...props} />
}
