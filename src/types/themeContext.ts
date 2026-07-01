export enum Theme {
  Reactive = 'reactive',
  Dark = 'dark',
  EmberDusk = 'ember-dusk',
  VerdantPulse = 'verdant-pulse',
  Black = 'black',
  CatppuccinMocha = 'catppuccin-mocha',
  NuclearDark = 'nuclear-dark',
  Discord = 'discord',
}

export interface IThemeContext {
  theme: Theme
  setTheme: (theme: Theme) => void
}
