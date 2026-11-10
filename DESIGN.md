# saj-service-desk design reference

The colours, type, spacing and components in use in this project, read from its stylesheets and components on 10 November 2026. Read this before interface work and update it when the styles change.

## Stack

| Package | Version |
|---|---|
| next | 16.3.4 |
| react | 19.2.8 |

## Style sources

| File | Characters of CSS |
|---|---|
| src/app/globals.css | 9901 |

## Colour

Custom properties that hold colours:

| Token | Value | Defined in |
|---|---|---|
| --ink | #17212b | src/app/globals.css |
| --muted | #65727d | src/app/globals.css |
| --line | #dce3e7 | src/app/globals.css |
| --paper | #fff | src/app/globals.css |
| --wash | #f4f7f8 | src/app/globals.css |
| --blue | #075985 | src/app/globals.css |
| --blue-soft | #e0f2fe | src/app/globals.css |
| --green | #166534 | src/app/globals.css |
| --green-soft | #dcfce7 | src/app/globals.css |
| --amber | #92400e | src/app/globals.css |
| --amber-soft | #fef3c7 | src/app/globals.css |
| --red | #991b1b | src/app/globals.css |
| --red-soft | #fee2e2 | src/app/globals.css |

Literal colour values used most in the stylesheets:

| Value | Uses |
|---|---|
| #fff | 10 |
| #102330 | 4 |
| #166534 | 2 |
| #65c8e8 | 2 |
| #31505d | 2 |
| #4da9c7 | 2 |
| #edf6f8 | 2 |
| #89cfe5 | 2 |
| #c4d6dc | 2 |
| #17212b | 1 |
| #65727d | 1 |
| #dce3e7 | 1 |
| #f4f7f8 | 1 |
| #075985 | 1 |
| #e0f2fe | 1 |
| #dcfce7 | 1 |
| #92400e | 1 |
| #fef3c7 | 1 |

## Type

Font stacks declared:

| font-family | Uses |
|---|---|
| "Bahnschrift SemiCondensed","Arial Narrow",sans-serif | 2 |
| "Aptos","Segoe UI",sans-serif | 1 |

Font sizes declared:

| font-size | Uses |
|---|---|
| .75rem | 3 |
| .8rem | 2 |
| .84rem | 2 |
| clamp(1.55rem,2vw,2.1rem) | 1 |
| 1.2rem | 1 |
| 1rem | 1 |
| 1.7rem | 1 |
| .72rem | 1 |
| .9rem | 1 |
| 1.1rem | 1 |
| clamp(2.6rem,6vw,5.5rem) | 1 |
| 1.04rem | 1 |

## Spacing and layout

| Media query | Uses |
|---|---|
| (max-width: 900px) | 2 |
| (max-width: 560px) | 1 |
| (prefers-reduced-motion: reduce) | 1 |
| (max-width: 520px) | 1 |

| max-width | Uses |
|---|---|
| 100vw | 2 |
| 1400px | 1 |
| 100% | 1 |
| 12ch | 1 |
| 58ch | 1 |

## Shape and depth

| border-radius | Uses |
|---|---|
| 7px | 3 |
| 6px | 2 |
| 9px | 2 |
| 99px | 2 |
| 5px | 2 |
| 50% | 2 |
| 10px | 1 |

| box-shadow | Uses |
|---|---|
| var(--shadow) | 2 |

## Other tokens

Custom properties for type, spacing, shadow and motion:

| Token | Value | Defined in |
|---|---|---|
| --shadow | 0 10px 30px rgba(23,33,43,.06) | src/app/globals.css |

## Components

- src/components: ServiceDesk.tsx
- src/components/public-request: PublicRequestPage.tsx
- src/components/service-desk: DemoNotice.tsx, OperationalForms.tsx, PublicRequestForm.tsx, StatePanel.tsx

6 component files in 3 folders.
