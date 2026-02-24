# Mode Selection

## How mode is determined

1. **Explicit override**: If the user states a preference, always honor it:
   - Automatic signals: "just do it", "go ahead", "automatic", "quick", "don't ask"
   - Interactive signals: "walk me through", "help me", "guide me", "step by step", "let me decide"

2. **Skill default**: Each skill defines its own default based on the nature of the task.

3. **Request analysis**: If no explicit signal and no strong skill default, assess the request:
   - Detailed, specific requirements → automatic
   - Brief, ambiguous, or subjective → interactive

## Mode behavior

**Automatic mode:**
- State assumptions briefly before proceeding
- Make reasonable decisions at each step
- Present the result when done
- Pause only if a critical ambiguity could lead to wasted work

**Interactive mode:**
- Ask clarifying questions at the start
- Present options at decision points
- Confirm before proceeding at checkpoints
- Allow the user to steer direction

## Mode switching

- If in automatic mode and the user asks a question or gives feedback → switch to interactive for the current phase
- If in interactive mode and the user says "looks good, go ahead" or similar → switch to automatic for remaining phases
