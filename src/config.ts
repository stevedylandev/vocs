import type { RehypeShikiOptions } from '@shikijs/rehype'
import type { SearchOptions } from 'minisearch'
import type { ReactElement } from 'react'
import type { TwoslashOptions } from 'twoslash'
import type { PluggableList } from 'unified'
import type { UserConfig } from 'vite'
import type {
  borderRadiusVars,
  contentVars,
  fontFamilyVars,
  fontSizeVars,
  fontWeightVars,
  lineHeightVars,
  outlineVars,
  primitiveColorVars,
  semanticColorVars,
  sidebarVars,
  spaceVars,
  topNavVars,
  viewportVars,
  zIndexVars,
} from './app/styles/vars.css.js'

type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

type RequiredProperties = 'blogDir' | 'markdown' | 'rootDir' | 'title' | 'titleTemplate'

export type Config<
  parsed extends boolean = false,
  colorScheme extends ColorScheme = ColorScheme,
> = RequiredBy<
  {
    /**
     * Whether or not to show the AI call-to-action dropdown on docs pages (ie. "Open in ChatGPT"),
     * as well as any configuration.
     */
    aiCta?:
      | boolean
      | {
          /**
           * Query for the LLM.
           */
          query: (p: { location: string }) => string
        }
    /**
     * Configuration for the banner fixed to the top of the page.
     *
     * Can be a Markdown string, a React Element, or an object with the following properties:
     * - `dismissable`: Whether or not the banner can be dismissed.
     * - `backgroundColor`: The background color of the banner.
     * - `content`: The content of the banner.
     * - `height`: The height of the banner.
     * - `textColor`: The text color of the banner.
     */
    banner?: Banner<parsed>
    /**
     * The base path the documentation will be deployed at. All assets and pages
     * will be prefixed with this path. This is useful for deploying to GitHub Pages.
     * For example, if you are deploying to `https://example.github.io/foo`, then the
     * basePath should be set to `/foo`.
     *
     * @example
     * /docs
     */
    basePath?: string
    /**
     * The base URL for your documentation. This is used to populate the `<base>` tag in the
     * `<head>` of the page, and is used to form the `%logo` variable for dynamic OG images.
     *
     * @example
     * https://vocs.dev
     */
    baseUrl?: string
    /**
     * Path to blog pages relative to project root.
     * Used to extract posts from the filesystem.
     *
     * @default "./pages/blog"
     */
    blogDir?: string
    /**
     * Directory to store cache files.
     *
     * @default "node_modules/vocs/_lib/vite/.vocs/cache"
     */
    cacheDir?: string
    /**
     * General description for the documentation.
     */
    description?: string
    /**
     * Edit location for the documentation.
     */
    editLink?: Normalize<EditLink>
    /**
     * Base font face.
     *
     * @default { google: "Inter" }
     */
    font?: Normalize<Font<parsed>>
    /**
     * Additional tags to include in the `<head>` tag of the page HTML.
     */
    head?:
      | ReactElement
      | { [path: string]: ReactElement }
      | ((params: { path: string }) => ReactElement | Promise<ReactElement>)
    /**
     * Icon URL.
     */
    iconUrl?: Normalize<IconUrl>
    /**
     * Logo URL.
     */
    logoUrl?: Normalize<LogoUrl>
    /**
     * OG Image URL. `null` to disable.
     *
     * Template variables: `%logo`, `%title`, `%description`
     *
     * @default "https://vocs.dev/api/og?logo=%logo&title=%title&description=%description"
     */
    ogImageUrl?: string | { [path: string]: string }
    /**
     * Outline footer.
     */
    outlineFooter?: ReactElement
    /**
     * Markdown configuration.
     */
    markdown?: Normalize<Markdown<parsed>>
    /**
     * Documentation root directory. Can be an absolute path, or a path relative from
     * the location of the config file itself.
     *
     * @default "docs"
     */
    rootDir?: string
    /**
     * Configuration for docs search.
     */
    search?: Normalize<Search>
    /**
     * Navigation displayed on the sidebar.
     */
    sidebar?: Normalize<Sidebar>
    /**
     * Social links displayed in the top navigation.
     */
    socials?: Normalize<Socials<parsed>>
    /**
     * Set of sponsors to display on MDX directives and (optionally) the sidebar.
     */
    sponsors?: SponsorSet[]
    /**
     * Theme configuration.
     */
    theme?: Normalize<Theme<parsed, colorScheme>>
    /**
     * Documentation title.
     *
     * @default "Docs"
     */
    title?: string
    /**
     * Template for the page title.
     *
     * @default `%s – ${title}`
     */
    titleTemplate?: string
    /**
     * Navigation displayed on the top.
     */
    topNav?: Normalize<TopNav<parsed>>
    /**
     * TwoSlash configuration.
     */
    twoslash?: Normalize<TwoslashOptions>
    /**
     * Vite configuration.
     */
    vite?: UserConfig
  },
  parsed extends true ? RequiredProperties : never
>

export type ParsedConfig = Config<true>

export async function defineConfig<colorScheme extends ColorScheme = undefined>({
  aiCta = true,
  blogDir = './pages/blog',
  cacheDir,
  head,
  ogImageUrl,
  rootDir = 'docs',
  title = 'Docs',
  titleTemplate = `%s – ${title}`,
  ...config
}: Config<false, colorScheme>): Promise<ParsedConfig> {
  const basePath = parseBasePath(config.basePath)
  return {
    aiCta,
    blogDir,
    cacheDir,
    head,
    ogImageUrl,
    rootDir,
    title,
    titleTemplate,
    ...config,
    basePath,
    banner: await parseBanner(config.banner ?? ''),
    font: parseFont(config.font ?? {}),
    iconUrl: parseImageUrl(config.iconUrl, {
      basePath,
    }),
    logoUrl: parseImageUrl(config.logoUrl, {
      basePath,
    }),
    markdown: parseMarkdown(config.markdown ?? {}),
    socials: parseSocials(config.socials ?? []),
    topNav: parseTopNav(config.topNav ?? []),
    theme: await parseTheme(config.theme ?? ({} as Theme)),
    vite: parseViteConfig(config.vite, {
      basePath,
    }),
  }
}

export const getDefaultConfig = async () => await defineConfig({})

//////////////////////////////////////////////////////
// Parsers

function parseBasePath(basePath_: string | undefined) {
  let basePath = basePath_
  if (!basePath) return ''
  if (!basePath.startsWith('/')) basePath = `/${basePath}`
  if (basePath.endsWith('/')) basePath = basePath.slice(0, -1)
  return basePath
}

async function parseBanner(banner: Banner): Promise<Banner<true> | undefined> {
  if (!banner) return undefined

  const bannerContent = (() => {
    if (typeof banner === 'string') return banner
    if (typeof banner === 'object' && 'content' in banner) return banner.content
    return undefined
  })()

  const content = await (async () => {
    if (typeof bannerContent !== 'string') return bannerContent

    const { compile } = await import('@mdx-js/mdx')
    const remarkGfm = (await import('remark-gfm')).default
    return String(
      await compile(bannerContent, {
        outputFormat: 'function-body',
        remarkPlugins: [remarkGfm],
      }),
    )
  })()

  if (!content) return undefined

  const textColor = await (async () => {
    if (typeof banner === 'string') return undefined
    if (typeof banner === 'object') {
      if ('textColor' in banner) return banner.textColor
      if ('backgroundColor' in banner && banner.backgroundColor) {
        const chroma = (await import('chroma-js')).default
        return chroma.contrast(banner.backgroundColor, 'white') < 4.5 ? 'black' : 'white'
      }
    }
    return undefined
  })()

  return {
    height: '32px',
    ...(typeof banner === 'object' ? banner : {}),
    content,
    textColor,
  }
}

function parseFont(font: Font): Font<true> {
  if ('google' in font) return { default: font }
  return font as Font<true>
}

function parseImageUrl(
  imageUrl: ImageUrl | undefined,
  { basePath }: { basePath?: string },
): ImageUrl | undefined {
  if (!imageUrl) return
  if (process.env.NODE_ENV === 'development') return imageUrl
  if (typeof imageUrl === 'string') {
    if (imageUrl.startsWith('http')) return imageUrl
    return `${basePath}${imageUrl}`
  }
  return {
    dark: imageUrl.dark.startsWith('http') ? imageUrl.dark : `${basePath}${imageUrl.dark}`,
    light: imageUrl.light.startsWith('http') ? imageUrl.light : `${basePath}${imageUrl.light}`,
  }
}

function parseMarkdown(markdown: Markdown): Markdown<true> {
  return {
    ...markdown,
    code: {
      themes: {
        dark: 'github-dark-dimmed',
        light: 'github-light',
      },
      ...markdown.code,
    },
  }
}

const socialsMeta = {
  discord: { label: 'Discord', type: 'discord' },
  farcaster: { label: 'Farcaster', type: 'farcaster' },
  github: { label: 'GitHub', type: 'github' },
  telegram: { label: 'Telegram', type: 'telegram' },
  warpcast: { label: 'Warpcast', type: 'warpcast' },
  x: { label: 'X (Twitter)', type: 'x' },
} satisfies Record<SocialItem['icon'], { label: string; type: SocialType }>

function parseSocials(socials: Socials): Socials<true> {
  return socials.map((social) => {
    return {
      icon: social.icon,
      link: social.link,
      ...socialsMeta[social.icon],
    }
  })
}

let id = 0

function parseTopNav(topNav: TopNav): TopNav<true> {
  const parsedTopNav: ParsedTopNavItem[] = []
  for (const item of topNav) {
    parsedTopNav.push({
      ...item,
      id: id++,
      items: item.items ? parseTopNav(item.items) : [],
    } as ParsedTopNavItem)
  }
  return parsedTopNav
}

async function parseTheme<colorScheme extends ColorScheme = undefined>(
  theme: Theme<false, colorScheme>,
): Promise<Theme<true>> {
  const chroma = (await import('chroma-js')).default
  const accentColor = (() => {
    if (!theme.accentColor) return theme.accentColor
    if (
      typeof theme.accentColor === 'object' &&
      !Object.keys(theme.accentColor).includes('light') &&
      !Object.keys(theme.accentColor).includes('dark')
    )
      return theme.accentColor

    const accentColor = theme.accentColor as string | { light: string; dark: string }
    const accentColorLight = typeof accentColor === 'object' ? accentColor.light : accentColor
    const accentColorDark = typeof accentColor === 'object' ? accentColor.dark : accentColor
    return {
      backgroundAccent: {
        dark: accentColorDark,
        light: accentColorLight,
      },
      backgroundAccentHover: {
        dark: chroma(accentColorDark).darken(0.25).hex(),
        light: chroma(accentColorLight).darken(0.25).hex(),
      },
      backgroundAccentText: {
        dark: chroma.contrast(accentColorDark, 'white') < 4.5 ? 'black' : 'white',
        light: chroma.contrast(accentColorLight, 'white') < 4.5 ? 'black' : 'white',
      },
      borderAccent: {
        dark: chroma(accentColorDark).brighten(0.5).hex(),
        light: chroma(accentColorLight).darken(0.25).hex(),
      },
      textAccent: {
        dark: accentColorDark,
        light: accentColorLight,
      },
      textAccentHover: {
        dark: chroma(accentColorDark).darken(0.5).hex(),
        light: chroma(accentColorLight).darken(0.5).hex(),
      },
    } satisfies Theme<true>['accentColor']
  })()
  return {
    ...theme,
    accentColor,
  } as Theme<true>
}

export function parseViteConfig(
  viteConfig: UserConfig | undefined,
  { basePath }: { basePath?: string },
): UserConfig {
  return {
    ...viteConfig,
    ...(basePath ? { base: basePath } : {}),
  }
}

//////////////////////////////////////////////////////
// Types

type Normalize<T> = {
  [K in keyof T]: T[K]
} & {}

export type Banner<parsed extends boolean = false> = Exclude<
  | string
  | ReactElement
  | {
      /** Whether or not the banner can be dismissed. */
      dismissable?: boolean
      /** The background color of the banner. */
      backgroundColor?: string
      /** The content of the banner. */
      content: string | ReactElement
      /** The height of the banner. */
      height?: string
      /** The text color of the banner. */
      textColor?: string
    }
  | undefined,
  parsed extends true ? string | ReactElement : never
>

export type ColorScheme = 'light' | 'dark' | 'system' | undefined

export type EditLink = {
  /**
   * Link pattern
   */
  pattern: string | (() => string)
  /**
   * Link text
   *
   * @default "Edit page"
   */
  text?: string
}

type FontSource = Normalize<{
  /** Name of the Google Font to use. */
  google?: string
}>
type ParsedFont = {
  default?: FontSource
  mono?: FontSource
}
export type Font<parsed extends boolean = false> = parsed extends true
  ? ParsedFont
  : FontSource | ParsedFont

export type ImageUrl = string | { light: string; dark: string }

export type IconUrl = ImageUrl

export type LogoUrl = ImageUrl

export type Markdown<parsed extends boolean = false> = RequiredBy<
  {
    code?: Normalize<RehypeShikiOptions>
    remarkPlugins?: PluggableList
    rehypePlugins?: PluggableList
  },
  parsed extends true ? 'code' : never
>

export type Search = SearchOptions

export type SidebarItem = {
  /** Whether or not to collapse the sidebar item by default. */
  collapsed?: boolean
  /** Whether or not to disable the sidebar item. */
  disabled?: boolean
  /** Text to display on the sidebar. */
  text: string
  /** Optional pathname to the target documentation page. */
  link?: string
  /** Optional children to nest under this item. */
  items?: SidebarItem[]
}

export type Sidebar =
  | SidebarItem[]
  | { [path: string]: SidebarItem[] | { backLink?: boolean; items: SidebarItem[] } }

export type SocialType = 'discord' | 'farcaster' | 'github' | 'telegram' | 'warpcast' | 'x'
export type SocialItem = {
  /** Social icon to display. */
  icon: SocialType // TODO: Support custom SVG icons
  /** Label for the social. */
  label?: string
  /** Link to the social. */
  link: string
}
export type ParsedSocialItem = Required<SocialItem> & {
  /** The type of social item. */
  type: SocialType
}

export type Socials<parsed extends boolean = false> = parsed extends true
  ? ParsedSocialItem[]
  : SocialItem[]

export type Sponsor = {
  /** The name of the sponsor. */
  name: string
  /** The link to the sponsor's website. */
  link: string
  /** The image to display for the sponsor. */
  image: string
}
export type SponsorSet = {
  /** The list of sponsors to display. */
  items: (Sponsor | null)[][]
  /** The name of the sponsor set (e.g. "Gold Sponsors", "Collaborators", etc). */
  name: string
  /** The height of the sponsor images. */
  height?: number
}

export type ThemeVariables<variables extends Record<string, unknown>, value> = {
  [key in keyof variables]?: value
}
export type Theme<
  parsed extends boolean = false,
  colorScheme extends ColorScheme = ColorScheme,
  ///
  colorValue = colorScheme extends 'system' | undefined ? { light: string; dark: string } : string,
> = {
  accentColor?: Exclude<
    | string
    | (colorScheme extends 'system' | undefined ? { light: string; dark: string } : never)
    | Required<
        ThemeVariables<
          Pick<
            typeof primitiveColorVars,
            | 'backgroundAccent'
            | 'backgroundAccentHover'
            | 'backgroundAccentText'
            | 'borderAccent'
            | 'textAccent'
            | 'textAccentHover'
          >,
          colorValue
        >
      >,
    parsed extends true ? string | { light: string; dark: string } : never
  >
  colorScheme?: colorScheme
  variables?: {
    borderRadius?: ThemeVariables<typeof borderRadiusVars, string>
    color?: ThemeVariables<typeof primitiveColorVars, colorValue> &
      ThemeVariables<typeof semanticColorVars, colorValue>
    content?: ThemeVariables<typeof contentVars, string>
    fontFamily?: ThemeVariables<typeof fontFamilyVars, string>
    fontSize?: ThemeVariables<typeof fontSizeVars, string>
    fontWeight?: ThemeVariables<typeof fontWeightVars, string>
    lineHeight?: ThemeVariables<typeof lineHeightVars, string>
    outline?: ThemeVariables<typeof outlineVars, string>
    sidebar?: ThemeVariables<typeof sidebarVars, string>
    space?: ThemeVariables<typeof spaceVars, string>
    topNav?: ThemeVariables<typeof topNavVars, string>
    viewport?: ThemeVariables<typeof viewportVars, string>
    zIndex?: ThemeVariables<typeof zIndexVars, string>
  }
}

export type TopNavItem<parsed extends boolean = false> =
  | {
      element: ReactElement
      link?: never
      items?: never
      match?: never
      text?: never
    }
  | ({
      element?: never
      match?: string
      text: string
    } & (
      | { link: string; items?: never }
      | { link?: string; items: parsed extends true ? ParsedTopNavItem[] : TopNavItem[] }
    ))

export type ParsedTopNavItem = TopNavItem<true> & {
  id: number
}

export type TopNav<parsed extends boolean = false> = parsed extends true
  ? ParsedTopNavItem[]
  : TopNavItem[]

//////////////////////////////////////////////////////
// Utilities

export function serializeConfig(config: Config) {
  return JSON.stringify(serializeFunctions(config))
}

export function deserializeConfig(config: string) {
  return deserializeFunctions(JSON.parse(config))
}

export function serializeFunctions(value: any, key?: string): any {
  if (Array.isArray(value)) {
    return value.map((v) => serializeFunctions(v))
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).reduce((acc, key) => {
      if (key[0] === '_') return acc
      acc[key] = serializeFunctions(value[key], key)
      return acc
    }, {} as any)
  }
  if (typeof value === 'function') {
    let serialized = value.toString()
    if (key && (serialized.startsWith(key) || serialized.startsWith(`async ${key}`))) {
      serialized = serialized.replace(key, 'function')
    }
    return `_vocs-fn_${serialized}`
  }
  return value
}

export function deserializeFunctions(value: any): any {
  if (Array.isArray(value)) {
    return value.map(deserializeFunctions)
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).reduce((acc: any, key) => {
      acc[key] = deserializeFunctions(value[key])
      return acc
    }, {})
  }
  if (typeof value === 'string' && value.includes('_vocs-fn_')) {
    return new Function(`return ${value.slice(9)}`)()
  }
  return value
}

export const deserializeFunctionsStringified = `
  function deserializeFunctions(value) {
    if (Array.isArray(value)) {
      return value.map(deserializeFunctions)
    } else if (typeof value === 'object' && value !== null) {
      return Object.keys(value).reduce((acc, key) => {
        acc[key] = deserializeFunctions(value[key])
        return acc
      }, {})
    } else if (typeof value === 'string' && value.includes('_vocs-fn_')) {
      return new Function(\`return \${value.slice(9)}\`)()
    } else {
      return value
    }
  }
`
