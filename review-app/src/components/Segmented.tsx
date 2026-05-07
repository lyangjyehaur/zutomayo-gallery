import type { ComponentProps } from 'react'
import { Segmented as F7Segmented } from 'framework7-react'

type SegmentedProps = ComponentProps<typeof F7Segmented>

export default function Segmented(props: SegmentedProps) {
  return <F7Segmented roundIos roundMd={false} {...props} />
}
