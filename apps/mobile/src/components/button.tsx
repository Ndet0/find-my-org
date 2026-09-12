import { Pressable, type PressableProps, Text } from 'react-native'

type Variant = 'primary' | 'outline' | 'destructive' | 'ghost'
type Size = 'md' | 'sm'

const container: Record<Variant, string> = {
  primary: 'bg-neutral-900 dark:bg-neutral-50 active:bg-neutral-700 dark:active:bg-neutral-300',
  outline:
    'border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 active:bg-neutral-100 dark:active:bg-neutral-800',
  destructive: 'bg-tone-danger-strong active:opacity-90',
  ghost: 'active:bg-neutral-100 dark:active:bg-neutral-800',
}

const label: Record<Variant, string> = {
  primary: 'text-white dark:text-neutral-900',
  outline: 'text-neutral-900 dark:text-neutral-50',
  destructive: 'text-white',
  ghost: 'text-neutral-700 dark:text-neutral-300',
}

const padding: Record<Size, string> = {
  md: 'px-4 py-3',
  sm: 'px-3 py-2',
}

const fontSize: Record<Size, string> = {
  md: 'text-base',
  sm: 'text-sm',
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  disabled,
  className,
  ...props
}: Omit<PressableProps, 'children'> & {
  title: string
  variant?: Variant
  size?: Size
  className?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled ?? false }}
      disabled={disabled}
      className={`items-center justify-center rounded-lg ${padding[size]} ${container[variant]} ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}
      {...props}
    >
      <Text className={`${fontSize[size]} font-medium ${label[variant]}`}>{title}</Text>
    </Pressable>
  )
}
