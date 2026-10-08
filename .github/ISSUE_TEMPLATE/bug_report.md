name: Bug report
description: Something in the kernel behaves wrongly
labels: [bug]
body:
  - type: textarea
    id: what
    attributes:
      label: What happened
      description: Include the command you ran and the output.
    validations:
      required: true
  - type: input
    id: env
    attributes:
      label: Environment
      description: node --version, OS
    validations:
      required: true
