---
title: Dialogue Retrieval Agent
description: long context text
---

**Long context handling for deep dialogues**

---

The **Long Dialogue Model** builds off both the base model and the Function Call Agent. It includes an internal *split query agent* that breaks down prompts into fundamental units of information.

To keep the context window manageable, You use a few strategies:

* **Split query** - distill the query to its core elements
* **Embedding history** - instead of storing the entire history in context, we save it in a file or database
* **BM25 Index search** - extract relevant context from the history during each turn
* **Sliding windows** - avoid naive chunking of history

---

Assuming you've already set up a Function Calling Model, we'll build on top of that to create an even more powerful agent.

---

## `NewFnCallAgent`

You’ll need a few more packages:

```bash
go get github.com/sklyt/go-agentic/pkg/storage@v0.0.2 # for embedding
go get github.com/philippgille/chromem-go@latest # will remove this in favor of text embedding
```

### Setup

In `main.go`:

```go
var txtStore *storage.TxtStorage
var sessionID string = "mysession"

func doembedTxt(toembed []schema.Message, turnIdx int) []string {
	var docs []string
	for _, chunk := range toembed {
		docs = append(docs, chunk.Role+"\n\n"+chunk.Content.Value)
	}
	return docs
}

func main() {
    // ... more code here
}
```

`doembedTxt` is used by `txtStore` before saving the history to a file. This hook lets you customize what happens before the commit, in this case, extracting the text and converting it into a list that gets returned.

You’ll see how to extend this in **Advanced** (coming soon) when we create a custom `chromem` store.

---

### Building the Actual Model

```go
func main() {
	txtStore = storage.NewTxtStore("./workspace", sessionID)

	model := ollama.NewOllamaModel(
		func(c *ollama.OllamaModelConfig) {
			c.Model = "qwen3:1.7b"
			c.APIKey = "EMPTY"
			c.BaseURL = "http://localhost:11434"
		},
	)

	fnAgent := agent.NewFnCallAgent(model,
		agent.WithSystemMessage("You are a helpful AI assistant"),
		agent.WithTools([]tools.Tool{
			files.NewEditFile(),
			files.NewGrep(),
			files.NewReadFile(),
			websearch.NewWebSearch(),
		}),
	)

	dialogue := agent.NewDialogueRetrievalAgent(model,
		sessionID,
		agent.SPLITQUERY, // only split query is supported for now
		txtStore,
		doembedTxt)

	dialogue.FnAgent = fnAgent // assigning tool calling to dialogue agent

	RunLoop(context.Background(), dialogue)
}
```

`sessionID` is used for thread management. The history is saved as `sessionid.txt`.

---

## RunLoop

This is similar to `FnCallAgent`, but we pass the **pointer messages** (which are used for the sliding window).

```go
func RunLoop(ctx context.Context, agent *agent.DialogueRetrievalAgent[string]) error {
	messages := []schema.Message{}

	// Clear the screen
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

		messages = append(messages, schema.Message{
			Role:    "user",
			Content: schema.ContentItem{Type: "text", Value: userInput},
		})

		isThinking = true
		accum = ""

		fmt.Print("\n\u001b[95mQwen\u001b[0m: ")
		output, err := agent.Run(ctx, &messages)
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
					Role:    "assistant",
					Content: schema.ContentItem{Type: "text", Value: accum},
				})
				fmt.Println()
				if len(messages) > 5 {
					messages = messages[len(messages)-5:]
				}
				continue

			default:
				print(msg.Content.Value)
				if !isThinking {
					accum += msg.Content.Value
				}
			}
		}
		println("")
	}
	return nil
}
```

---

### Keeping Context Under Control

For now, the model holds the three most recent messages and embeds anything beyond that. This helps keep the dialogue flowing without overwhelming the context.

```go
agent := &DialogueRetrievalAgent[A]{
	model:            baseModel,
	workspace:        DEFAULT_WORKSPACE,
	sessionID:        sessionID,
	lang:             "en",
	store:            store,
	turnIdx:          0,
	turnsBeforeEmbed: 3,   // embed after 3 turns
	keepHistory:      3,  // keep the last 3 messages
	embedFactory:     doembed,
}
```

---

And that’s it! Easy, right?

Feel free to extend the model with more features as you go, and stay tuned for the **Advanced** section coming soon.
