
type keyColor = 'black' | 'silver' | 'gray' | 'white' | 'maroon' | 'red' | 'purple' | 'fuchsia' | 'green' | 'lime' |
  'olive' | 'yellow' | 'navy' | 'blue' | 'teal' | 'aqua' | 'orange' | 'cyan' | 'brown' | 'violet' | 'pink' | 'magenta' | 'aliceblue' |
  'antiquewhite' | 'aquamarine' | 'azure' | 'beige' | 'bisque' | 'blanchedalmond' | 'blueviolet' | 'cadetblue' | 'coral' | 'cornflowerblue' |
  'crimson' | 'rebeccapurple' | 'tan' | 'wheat' | 'tomato'

export type cssColor = `#${string}` |
  `rgb(${number}, ${number}, ${number})` | `rgba(${number}, ${number}, ${number}, ${number})` |
  `hsl(${number}${'deg' | ''}${',' | ''} ${number}${',' | ''} ${number})` |
  `hsla(${number}${'deg' | ''}${',' | ''} ${number}${',' | ''} ${number}${',' | ' /'} ${number})` |
  keyColor | `dark${keyColor}` | `light${keyColor}` | `slate${keyColor}` | `darkslate${keyColor}` | `lightslate${keyColor}` | 'transparent'

export type ValidVariable = 
  'bg' | 'tools' | 'activeTab' | 'tabList' | 'tabHover' | 'tabActive' |
  'toolHover' | 'toolActive' |
  'accent' | 'textColor' | 'dimTextColor'