
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { 
  HelpCircle, 
  ChevronDown, 
  Mail, 
  Phone, 
  MessageCircle,
  BookOpen,
  Users,
  Wrench
} from "lucide-react";

const Help = () => {
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: ''
  });

  const faqs = [
    {
      question: "How do I add a new tool to my collection?",
      answer: "Navigate to the 'My Tools' section and click the 'Add Tool' button. Fill in the tool details including name, description, category, and upload an image if you have one."
    },
    {
      question: "How do I request to borrow a tool?",
      answer: "Find the tool you want to borrow through search or by browsing your group's tools. Click on the tool and then click 'Request to Borrow'. Select your desired dates and add a message to the owner."
    },
    {
      question: "How do I create or join a group?",
      answer: "To create a group, go to the 'Groups' section and click 'Create Group'. To join a group, you'll need an invitation link from an existing group member or admin."
    },
    {
      question: "What happens when someone requests my tool?",
      answer: "You'll receive a notification when someone requests to borrow your tool. You can approve or deny the request from your notifications or the requests page."
    },
    {
      question: "How do I return a borrowed tool?",
      answer: "When you're ready to return a tool, go to your active borrowing requests and click 'Mark as Returned'. The tool owner will then confirm the return."
    },
    {
      question: "Can I edit my tool information after adding it?",
      answer: "Yes! Go to 'My Tools', find the tool you want to edit, and click on it. Then click the 'Edit Tool' button to modify the details."
    }
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      toast({
        title: "Please fill in all fields",
        description: "Both subject and message are required.",
        variant: "destructive",
      });
      return;
    }

    // Simulate sending the message
    toast({
      title: "Message sent",
      description: "Thank you for contacting us. We'll get back to you soon!",
    });
    
    setContactForm({ subject: '', message: '' });
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Help & Support</h1>
          <p className="text-muted-foreground">
            Find answers to common questions or get in touch with our support team.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Getting Started
              </CardTitle>
              <CardDescription>
                New to Tool Share? Here's how to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 mt-1 text-primary" />
                <div>
                  <h4 className="font-medium">1. Join or Create a Group</h4>
                  <p className="text-sm text-muted-foreground">
                    Start by joining an existing group or creating your own tool sharing community.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wrench className="h-5 w-5 mt-1 text-primary" />
                <div>
                  <h4 className="font-medium">2. Add Your Tools</h4>
                  <p className="text-sm text-muted-foreground">
                    List the tools you're willing to share with your group members.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 mt-1 text-primary" />
                <div>
                  <h4 className="font-medium">3. Start Sharing</h4>
                  <p className="text-sm text-muted-foreground">
                    Browse available tools and start making requests to borrow from others.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Need help? Send us a message and we'll get back to you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="What do you need help with?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Describe your issue or question..."
                    rows={4}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              Quick answers to common questions about Tool Share.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <Collapsible key={index}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50 text-left">
                    <span className="font-medium">{faq.question}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Other Ways to Get Help</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-medium">Email Support</h4>
                  <p className="text-sm text-muted-foreground">support@toolshare.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-medium">Phone Support</h4>
                  <p className="text-sm text-muted-foreground">1-800-TOOLSHARE</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Help;
