---
title: Function Call Agent
description: Tools and Tool Calling Agent
---

A model for complex tasks and can interact with the oustide world using [tools](https://ollama.com/blog/tool-support)


Qwen-agent comes with some builtin tools you can use:
 - edit_file - Make edits to a text file.
 - list_files - List files and directories at a given path
 - read_file  - File viewing tool that reads and displays the contents of files with line numbers (adapted from [opencode](https://github.com/sst/opencode))
 - glob -  Fast file pattern matching tool that finds files by name and pattern (from opencode)
 - grep - Fast content search tool that finds files containing specific text or patterns (from opencode)
 - web_search  - Perform web searches using DuckDuckGo and retrieve content from top results.


 ## NewFnCallAgent

 At the end of this we should have an agent with tool capabilities(e.g searching the web: )

 Assuming you have a basic model running and a golang project see getting started.


 ```go
import 	(
  "github.com/sklyt/qwen-agent/pkg/llm/ollama"
  "github.com/sklyt/qwen-agent/pkg/schema"
  "github.com/sklyt/qwen-agent/pkg/agent" 
  "github.com/sklyt/qwen-agent/pkg/tools"
  "github.com/sklyt/qwen-agent/pkg/tools/files"
  websearch "github.com/sklyt/qwen-agent/pkg/tools/web"
)

func RunLoop(ctx context.Context, agent *agent.FnCallAgent) error {}

func main(){

	model := ollama.NewOllamaModel(
		func(c *ollama.OllamaModelConfig) {
			c.Model = "qwen3:1.7b"
			c.APIKey = "EMPTY"
			c.BaseURL = "http://localhost:11434"
		},
	)

 fn := agent.NewFnCallAgent(model, agent.WithTools([]tools.Tool{files.NewReadFile(), files.NewEditFile(), files.NewListFiles(),
		files.NewGlob(), files.NewGrep(), websearch.NewWebSearch()}))

}

RunLoop(context.TODO(), fn) // message loop.

 ```

 NewFnCallAgent takes the base model, and [functional options](https://dev.to/sfundomhlungu/golang-master-class-functional-options-5a00), `agent.WithTools` provides tools for the model. we bundled two models to get a super model.

### Runloop (you can structure it however you want, below is a basic one with turns)

```go

var (
	isThinking = true
	accum      = "" // to be sent as history
)

func RunLoop(ctx context.Context, agent *agent.FnCallAgent) error {
	messages := []schema.Message{}

	// Clear screen
	fmt.Print("\033[H\033[2J")
	fmt.Println("Chat with Qwen (use 'ctrl-c' to quit)")

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

		messages = append(messages, schema.Message{Role: "user", Content: schema.ContentItem{Type: "text", Value: userInput}})


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
				println("🤔 thinking....")
				isThinking = true
				continue

			case msg.Content.Value == "</think>":
				println("🤔 done thinking....")

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
				print(msg.Content.Value)
				if isThinking {
					// print(msg.Content)  // uncomment to see thinking output
				}
				if !isThinking {
					accum += msg.Content.Value

				}
			}
		}
	}
	return nil
}


```

Run the model:

```bash 
go run .
```

basic prompt example

search the web for current news on Agentic AI, summarize them into few concise points

In the terminal you should see something like: 🌐 Searching web for: current news on Agentic AI

## More on Tools and Functional Options 


I provide only two functional options to set the system message and tools:

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
			// println(a.tools)
		}
	}

}

```
Any thing else you can extend the qwen with tools see advanced.
