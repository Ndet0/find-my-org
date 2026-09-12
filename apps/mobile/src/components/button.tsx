import { Pressable, type PressableProps, Text } from 'react-native'

type Variant = 'primary' | 'outline' | 'destructive' | 'ghost'
type Size = 'md' | 'sm'

const container: Record<Variant, string> = {
  primary: 'bg-neutral-900 active:bg-neutral-700',
  outline: 'border border-neutral-300 bg-white active:bg-neutral-100',
  destructive: 'bg-tone-danger-strong active:opacity-90',
  ghost: 'active:bg-neutral-100',
}

const label: Record<Variant, string> = {
  primary: 'text-white',
  outline: 'text-neutral-900',
  destructive: 'text-white',
  ghost: 'text-neutral-700',
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
