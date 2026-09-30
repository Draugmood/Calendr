import type { KeyboardButtonTheme, KeyboardLayoutObject } from "react-simple-keyboard";

export type KeyboardLayoutName = "default" | "shift" | "symbols" | "numeric";

export const KEYBOARD_LAYOUTS: KeyboardLayoutObject = {
  default: [
    "1 2 3 4 5 6 7 8 9 0 {bksp}",
    "q w e r t y u i o p å",
    "a s d f g h j k l ø æ",
    "{shift} z x c v b n m , . -",
    "{symbols} {space} {enter} {hide}",
  ],
  shift: [
    '! " # % & / ( ) = ? {bksp}',
    "Q W E R T Y U I O P Å",
    "A S D F G H J K L Ø Æ",
    "{shift} Z X C V B N M ; : _",
    "{symbols} {space} {enter} {hide}",
  ],
  symbols: [
    "1 2 3 4 5 6 7 8 9 0 {bksp}",
    "@ # % & * + = / ( )",
    "- _ ' \" : ; ! ? , .",
    "{abc} {space} {enter} {hide}",
  ],
  numeric: ["1 2 3", "4 5 6", "7 8 9", ": 0 {bksp}", "{enter} {hide}"],
};

export function getKeyboardDisplay(enterLabel: string): Record<string, string> {
  return {
    "{bksp}": "⌫",
    "{shift}": "⇧",
    "{space}": " ",
    "{enter}": enterLabel,
    "{hide}": "Skjul",
    "{symbols}": "?123",
    "{abc}": "ABC",
  };
}

export function getKeyboardButtonTheme(
  layoutName: KeyboardLayoutName,
): KeyboardButtonTheme[] {
  const themes: KeyboardButtonTheme[] = [
    { class: "osk-action", buttons: "{bksp} {shift} {symbols} {abc} {hide}" },
    { class: "osk-primary", buttons: "{enter}" },
    { class: "osk-space", buttons: "{space}" },
  ];
  if (layoutName === "shift") {
    themes.push({ class: "osk-active", buttons: "{shift}" });
  }
  return themes;
}
