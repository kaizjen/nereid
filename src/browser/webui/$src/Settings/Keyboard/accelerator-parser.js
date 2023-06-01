export function stringFromSegment(segment) {
  if (segment == "CmdOrCtrl" || segment == "CommandOrControl") {
    return nereid.app.os == 'darwin' ? "⌘" : "Ctrl";
  }
  if (segment == "Control") return "Ctrl";
  if (segment == "Command") return "⌘";
  if (segment == "Super" || segment == "Meta") {
    return nereid.app.os == 'darwin' ?
      "⌘" :
      (nereid.app.os == 'win32' ?
        "⊞ Win" :
        ("❖ " + segment)
      )
      ;
  }

  if (segment == "Option" || (segment == "Alt" && nereid.app.os == 'darwin')) {
    return "⌥ Option"
  }

  if (segment == "Escape") {
    return "Esc"
  }

  if (segment == "Return" || segment == "Enter") {
    return "↩ " + segment
  }

  return segment;
}

export function getSegments(accelerator) {
  return (accelerator || '').split('+')
    .map(str => str == '' ? '+' : str)
    .filter((item, i, arr) => item != '+' || arr[i + 1] != '+')
  ;
}