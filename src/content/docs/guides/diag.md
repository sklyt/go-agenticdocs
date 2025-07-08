---
title: Dialogue Retrieval Agent
description: long context text
---


The Long dialogue Model builds from both base model and fn call agent! with an internal split query agent(break prompt to fundamental units of information).

It's uses a few methods to to keep the messages in the context window minimal:

- Split query - distill the query to it's fundamental information 
- Embedding the history - instead of the entire history in the context store in a file or db 
- BM25Index search - on each turn extract relevant context from the history as memory 
- Sliding windows - to avoid naive history chunking 


Assuming you have a function calling model, we'll fuse on top of it to build an even powerful one 


## `NewFnCallAgent`

Fetch some more pkgs 

```bash 
go get github.com/sklyt/go-agentic/pkg/storage@v0.0.2 # for embedding 
go get github.com/philippgille/chromem-go@latest # will remove in the future in favor of txt embedding
```

### Setup 

In `main.go`


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

func main(){
    //... more code here
}
```

`doembedTxt` is used by txtstore before saving the history in file, this hook allows you to do something before the commit, here 

I am looping over the messages from toembed, extracting the text and putting the in a list(which is returned)

This is useful for creating your own custom embed, as you'll see in advanced when we create a custom chromen store (coming soon)

### Building the actual model 

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

	fnagent := agent.NewFnCallAgent(model, agent.WithSystemMessage("Your are a helpful AI assistant"),
		agent.WithTools([]tools.Tool{files.NewEditFile(),
			files.NewGrep(),
			files.NewReadFile(),
			websearch.NewWebSearch()}))

	dialogue := agent.NewDialogueRetrievalAgent(model,
		sessionID,
		agent.SPLITQUERY, // split query (only supported for now)
		txtStore,
		doembedTxt)

	dialogue.FnAgent = fnagent // assign tool calling to dialogue agent

	RunLoop(context.Background(), dialogue)

}


```

The sessionid, is for threads, the file is saved as `sessionid.txt` 

## Runloop 

same as fn except the pointer messages(which the model needs for sliding window)

```go
func RunLoop(ctx context.Context, agent *agent.DialogueRetrievalAgent[string]) error {
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
		output, err := agent.Run(ctx, &messages)
		// output, err := agent.Run(ctx, &messages)
		if err != nil {
			panic(err)
		}

		var markdownBuffer strings.Builder

		for msg := range output {
			// print(msg.Content.Value)
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
				if isThinking {
					// print(msg.Content)  // uncomment to see thinking output
				}
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


The model should now hold long conversations w/o overflowing the context 


Workning on exposing tunable params, for now the model should keep 3 new recent messages and embed any messages when bigger than 3:

```go

	agent := &DialogueRetrievalAgent[A]{
		model:            baseModel,
		workspace:        DEFAULT_WORKSPACE,
		sessionID:        sessionID,
		lang:             "en",
		store:            store,
		turnIdx:          0,
		turnsBeforeEmbed: 3,   // exchange before triggering doembed
		keepHistory:      3,  // recent messages
		embedFactory:     doembed,
	}
```


That's it! easy