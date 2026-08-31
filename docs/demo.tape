# Renders docs/images/demo.gif with https://github.com/charmbracelet/vhs
#
#   brew install vhs && vhs docs/demo.tape
#
# It runs the published CLI and stops at the module picker: everything past that
# point asks for a Chatfuel token, and a recording is not the place for one. The
# hidden first command only warms the npx cache, so the visible run starts at once.

Output docs/images/demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 1200
Set Height 800
Set Padding 32
Set Theme "Catppuccin Mocha"
Set TypingSpeed 55ms

Hide
Type "npx -y @chatfuel/wizard doctor > /dev/null 2>&1; clear"
Enter
Sleep 90s
Show

Type "npx @chatfuel/wizard --dir ./my-chatfuel-app"
Sleep 400ms
Enter
Sleep 12s

Enter
Sleep 3s

Down
Sleep 1200ms
Down
Sleep 1200ms
Down
Sleep 2500ms

Ctrl+C
Sleep 2s
