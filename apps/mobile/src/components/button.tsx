import { Pressable, type PressableProps, Text } from 'react-native'

type Variant = 'primary' | 'outline' | 'destructive' | 'ghost'

const container: Record<Variant, string> = {
  primary: 'bg-neutral-900 active:bg-neutral-700',
  outline: 'border border-neutral-300 bg-white active:bg-neutral-100',
  destructive: 'bg-red-600 active:bg-red-500',
  ghost: 'active:bg-neutral-100',
}

const label: Record<Variant, string> = {
  primary: 'text-white',
  outline: 'text-neutral-900',
  destructive: 'text-white',
  ghost: 'text-neutral-700',
}

export function Button({
  title,
  variant = 'primary',
  disabled,
  className,
  ...props
}: Omit<PressableProps, 'children'> & { title: string; variant?: Variant; className?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled ?? false }}
      disabled={disabled}
      className={`items-center justify-center rounded-lg px-4 py-3 ${container[variant]} ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}
      {...props}
    >
      <Text className={`text-base font-medium ${label[variant]}`}>{title}</Text>
    </Pressable>
  )
}
