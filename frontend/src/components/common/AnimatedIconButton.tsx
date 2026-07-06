import React from 'react';
import { IconButton as PaperIconButton, type IconButtonProps } from 'react-native-paper';
import { AnimateOnHover } from './AnimateOnHover';

type AnimatedIconButtonProps = IconButtonProps & {
  animateOnHover?: boolean;
};

export function AnimatedIconButton({
  animateOnHover = true,
  disabled,
  loading,
  ...props
}: AnimatedIconButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  const button = <PaperIconButton disabled={disabled} loading={loading} {...props} />;

  if (!animateOnHover) return button;

  return (
    <AnimateOnHover disabled={isDisabled}>
      {button}
    </AnimateOnHover>
  );
}

export { AnimatedIconButton as IconButton };
