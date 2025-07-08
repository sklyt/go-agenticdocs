---
title: Function Call Agent
description: Tools and Tool Calling Agent
---

# Function Call Agent

**Tools and Tool-Calling Agent**

---

This model is built for complex tasks — and more importantly, it can interact with the outside world using [tools](https://ollama.com/blog/tool-support).

---

## `NewFnCallAgent`

By the end of this, you'll have an agent that can do things like search the web or edit files, not just generate text.

Assuming you’ve already got a base model running (see [Getting Started](./example.md)) and a Go project set up, let’s dive in.

### Install the tool packages:

```bash
go get github.com/sklyt/go-agentic/pkg/tools/web@v0.0.2
go get github.com/sklyt/go-agentic/pkg/tools/files@v0.0.2
```

---

### The Function-Calling Model

```go
import (
	"context"
	"fmt"
	"strings"

	"github.com/sklyt/qwen-agent/pkg/llm/ollama"
	"github.com/sklyt/qwen-agent/pkg/schema"
	"github.com/sklyt/qwen-agent/pkg/agent"
	"github.com/sklyt/qwen-agent/pkg/tools"
	"github.com/sklyt/qwen-agent/pkg/tools/files"
	websearch "github.com/sklyt/qwen-agent/pkg/tools/web"
)

func RunLoop(ctx context.Context, agent *agent.FnCallAgent) error {}

func main() {
	model := ollama.NewOllamaModel(
		func(c *ollama.OllamaModelConfig) {
			c.Model = "qwen3:1.7b"
			c.APIKey = "EMPTY"
			c.BaseURL = "http://localhost:11434"
		},
	)

	fn := agent.NewFnCallAgent(model,
		agent.WithTools([]tools.Tool{
			files.NewReadFile(),
			files.NewEditFile(),
			files.NewListFiles(),
			files.NewGlob(),
			files.NewGrep(),
			websearch.NewWebSearch(),
		}),
	)

	RunLoop(context.TODO(), fn)
}
```

---

`NewFnCallAgent` takes a base model and combines it with [functional options](https://dev.to/sfundomhlungu/golang-master-class-functional-options-5a00).
Here, we use `agent.WithTools` to give the model tool capabilities. It’s a bundle-of-models approach, like fusing together two Pokémon to get a more powerful one.

---

## The `RunLoop`

(Feel free to structure it your own way, this is just a simple version with conversational turns.)

```go
var (
	isThinking = true
	accum      = "" // to be sent as assistant history
)

var scanner = bufio.NewScanner(os.Stdin)

func getUserMessage() (string, bool) {

	if !scanner.Scan() {
		return "", false
	}
	return scanner.Text(), true

}




func RunLoop(ctx context.Context, agent *agent.FnCallAgent) error {
	messages := []schema.Message{}

	// Clear the screen
	fmt.Print("\033[H\033[2J")
	fmt.Println("Chat with Qwen (press ctrl-c to quit)")

	for {
		fmt.Print("\n\u001b[94mYou\u001b[0m: ")
		userInput, ok := getUserMessage()
		if !ok {
			break
		}

		if accum != "" {
			accum = strings.TrimSpace(accum)
			messages = append(messages, schema.Message{
				Role:    "assistant",
				Content: schema.ContentItem{Type: "text", Value: accum},
			})
		}

		messages = append(messages, schema.Message{
			Role:    "user",
			Content: schema.ContentItem{Type: "text", Value: userInput},
		})

		isThinking = true
		accum = ""

		fmt.Print("\n\u001b[95mQwen\u001b[0m: ")
		output, err := agent.Run(ctx, messages)
		if err != nil {
			panic(err)
		}

		var markdownBuffer strings.Builder

		for msg := range output {
			switch {
			case msg.Role == "tool" || msg.Role == "assistant":
				messages = append(messages, msg)
				continue

			case msg.Error != "":
				fmt.Printf("\nError: %v\n", msg.Error)
				continue

			case msg.Content.Value == "<think>":
				fmt.Println("🤔 thinking...")
				isThinking = true
				continue

			case msg.Content.Value == "</think>":
				fmt.Println("🤔 done thinking.")
				isThinking = false
				continue

			case msg.Done:
				accum = strings.TrimSpace(markdownBuffer.String())
				messages = append(messages, schema.Message{
					Role:    "Qwen",
					Content: schema.ContentItem{Type: "text", Value: accum},
				})
				fmt.Println()
				if len(messages) > 5 {
					messages = messages[len(messages)-5:]
				}
				continue

			default:
				fmt.Print(msg.Content.Value)
				if !isThinking {
					accum += msg.Content.Value
				}
			}
		}
	}
	return nil
}
```

---

### Run It:

```bash
go run .
```

---

### Example Prompt:

> search the web for current news on Agentic AI, summarize them into a few concise points


---

### Built-in Tools (`go-agentic`)

You’ve got some handy ones baked in:

* `edit_file` – Make edits to a text file
* `list_files` – List files/directories at a path
* `read_file` – Read file contents (with line numbers) [adapted from opencode](https://github.com/sst/opencode)
* `glob` – Fast file pattern matcher (also from opencode)
* `grep` – Fast content search for matching text/patterns
* `web_search` – Search the web using DuckDuckGo

---

## More on Tools & Functional Options

I expose just two core functional options:

```go
func WithSystemMessage(msg string) AgentOption {
	return func(a *BaseAgent) {
		a.systemMsg = msg
	}
}

func WithTools(tools []tools.Tool) AgentOption {
	return func(a *BaseAgent) {
		for _, tool := range tools {
			a.tools[tool.Name()] = tool
		}
	}
}
```

Everything else?
You can extend Qwen with your own tools, I’ll cover that in the *Advanced* section (coming soon).

