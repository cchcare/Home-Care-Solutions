import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  Send, 
  User, 
  Loader2,
  Sparkles,
  MessageSquare,
  Calendar,
  Users,
  FileText,
  ClipboardList
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
}

const SUGGESTED_PROMPTS = [
  { icon: Users, text: "Show me all active clients", category: "Clients" },
  { icon: Users, text: "List all caregivers", category: "Caregivers" },
  { icon: Calendar, text: "Create a schedule for a client visit", category: "Scheduling" },
  { icon: FileText, text: "Create a note for a caregiver", category: "Notes" },
  { icon: ClipboardList, text: "Assign a client to a caregiver", category: "Assignments" },
];

export default function AIAssistant() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await apiRequest("POST", "/api/ai-assistant/chat", {
        message: userMessage,
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response,
        actions: data.actions
      }]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get response from AI",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    chatMutation.mutate(userMessage);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    if (chatMutation.isPending) return;
    setMessages(prev => [...prev, { role: "user", content: prompt }]);
    chatMutation.mutate(prompt);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="AI Assistant" />
        
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full max-w-4xl mx-auto flex flex-col">
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="border-b shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  AI Assistant
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    Ask me to help with scheduling, assignments, notes, and more
                  </span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                <ScrollArea className="flex-1 p-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">How can I help you today?</h3>
                      <p className="text-muted-foreground mb-6 max-w-md">
                        I can help you manage clients, caregivers, schedules, and more. 
                        Just type what you need or try one of the suggestions below.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                        {SUGGESTED_PROMPTS.map((prompt, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="justify-start h-auto py-3 px-4"
                            onClick={() => handleSuggestedPrompt(prompt.text)}
                            data-testid={`button-suggestion-${index}`}
                          >
                            <prompt.icon className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="text-left">{prompt.text}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {message.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                            data-testid={`message-${message.role}-${index}`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {message.actions && message.actions.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                                {message.actions.map((action, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <span className="text-green-600">✓</span> {action}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {message.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {chatMutation.isPending && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 border-t shrink-0">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your request... (e.g., 'Assign John Smith to caregiver Mary')"
                      disabled={chatMutation.isPending}
                      className="flex-1"
                      data-testid="input-chat"
                    />
                    <Button 
                      type="submit" 
                      disabled={!input.trim() || chatMutation.isPending}
                      data-testid="button-send"
                    >
                      {chatMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
