---
title: ReAct Agent
description: Thought/Action/Action Input/Observation
---



**Already Implemented docs coming soon!**


```Go

const (
	reactTemplate = `Answer the following questions as best you can. You have access to the following tools:
{tool_descs}


Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of {tool_names}
Action Input: the input to the action
Observation: the result of the action, [keep this two lines max, the more concise the better]
... (this Thought/Action/Action Input/Observation can be repeated zero or more times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question


Begin!

Question: {query}
Thought:`
)


```