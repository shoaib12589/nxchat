'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Save, Mail, ArrowLeft, Eye, TestTube, Code, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface EmailTemplate {
  id?: number;
  name: string;
  type: string;
  subject: string;
  html_content: string;
  text_content: string;
  variables: string[];
  description: string;
  is_active: boolean;
}

const templateTypes = [
  { value: 'verification', label: 'Verification', variables: ['name', 'email', 'verification_link', 'expires_at'] },
  { value: 'password_reset', label: 'Password Reset', variables: ['name', 'email', 'reset_link', 'expires_at'] },
  { value: 'welcome', label: 'Welcome', variables: ['name', 'email', 'login_link', 'role'] },
  { value: 'agent_invitation', label: 'Agent Invitation', variables: ['name', 'email', 'company', 'login_credentials', 'verification_link'] },
  { value: 'notification', label: 'Notification', variables: ['name', 'message', 'action_url', 'timestamp'] },
  { value: 'chat_assignment', label: 'Chat Assignment', variables: ['agent_name', 'customer_name', 'chat_url'] },
  { value: 'ticket_created', label: 'Ticket Created', variables: ['customer_name', 'ticket_id', 'ticket_subject', 'ticket_message', 'ticket_status', 'ticket_url', 'created_at'] },
  { value: 'ticket_reply', label: 'Ticket Reply', variables: ['customer_name', 'ticket_id', 'ticket_subject', 'agent_name', 'reply_message', 'ticket_url', 'replied_at'] },
  { value: 'custom', label: 'Custom', variables: [] }
];

export default function EmailTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const [template, setTemplate] = useState<EmailTemplate>({
    name: '',
    type: 'custom',
    subject: '',
    html_content: '',
    text_content: '',
    variables: [],
    description: '',
    is_active: true
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (!isNew) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getEmailTemplate(parseInt(id));
      
      if (response.success) {
        setTemplate(response.data);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      toast.error('Failed to load email template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!template.name || !template.subject || !template.html_content) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (isNew) {
        const response = await apiClient.createEmailTemplate(template);
        if (response.success) {
          toast.success('Template created successfully');
          router.push(`/superadmin/email-templates/${response.data.id}`);
        }
      } else {
        const response = await apiClient.updateEmailTemplate(parseInt(id), template);
        if (response.success) {
          toast.success('Template updated successfully');
        }
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('html_content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = template.html_content;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      setTemplate({
        ...template,
        html_content: before + `{${variable}}` + after
      });
      // Reset cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 2, start + variable.length + 2);
      }, 0);
    }
  };

  const professionalEmailTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                {header_title}
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                {header_subtitle}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello {name},
              </p>
              
              <!-- Main Message -->
              <div style="color: #555555; font-size: 15px; line-height: 1.8;">
                {message_content}
              </div>
              
              <!-- Call to Action Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{action_url}" style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      {action_text}
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Additional Information -->
              <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #667eea;">
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  {additional_info}
                </p>
              </div>
              
              <!-- Closing -->
              <p style="margin: 30px 0 0 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Best regards,<br>
                <strong style="color: #667eea;">The NxChat Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 13px; line-height: 1.5;">
                This is an automated email from <strong style="color: #667eea;">NxChat</strong>.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2024 NxChat. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const insertProfessionalTemplate = () => {
    if (template.html_content && !confirm('This will replace your current HTML content. Continue?')) {
      return;
    }
    setTemplate({
      ...template,
      html_content: professionalEmailTemplate
    });
    toast.success('Professional template inserted! Customize the content as needed.');
  };

  const selectedType = templateTypes.find(t => t.value === template.type);

  if (loading) {
    return <LoadingSpinner text="Loading template..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/superadmin/email-templates')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isNew ? 'Create Email Template' : 'Edit Email Template'}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? 'Create a new email template' : template.name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <Code className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Template name and type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={template.name}
                  onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                  placeholder="e.g., Welcome Email"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Template Type *</Label>
                  <select
                    id="type"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={template.type}
                    onChange={(e) => setTemplate({ ...template, type: e.target.value })}
                  >
                    {templateTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(checked) => setTemplate({ ...template, is_active: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={template.description}
                  onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                  placeholder="Brief description of this template"
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Content */}
          <Card>
            <CardHeader>
              <CardTitle>Email Content</CardTitle>
              <CardDescription>Subject and message</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={template.subject}
                  onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                  placeholder="e.g., Welcome to NxChat!"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="html_content">HTML Content *</Label>
                  {!previewMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={insertProfessionalTemplate}
                      className="text-xs"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Use Professional Template
                    </Button>
                  )}
                </div>
                {!previewMode ? (
                  <Textarea
                    id="html_content"
                    rows={15}
                    value={template.html_content}
                    onChange={(e) => setTemplate({ ...template, html_content: e.target.value })}
                    placeholder="<div><h1>Hello {name}!</h1><p>Welcome to our platform.</p></div>"
                    className="font-mono text-sm"
                  />
                ) : (
                  <div className="border rounded-md p-4 bg-muted/50 overflow-auto max-h-[600px]">
                    <div 
                      dangerouslySetInnerHTML={{ __html: template.html_content }}
                      className="prose max-w-none"
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Use HTML tags and {`{variable}`} syntax for dynamic content. Click "Use Professional Template" to start with a responsive email design.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text_content">Plain Text Content</Label>
                <Textarea
                  id="text_content"
                  rows={5}
                  value={template.text_content}
                  onChange={(e) => setTemplate({ ...template, text_content: e.target.value })}
                  placeholder="Plain text version of the email"
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Variables & Options */}
        <div className="space-y-6">
          {/* Available Variables */}
          {selectedType && selectedType.variables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Available Variables</CardTitle>
                <CardDescription>Click to insert</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedType.variables.map((variable) => (
                  <Button
                    key={variable}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => insertVariable(variable)}
                  >
                    {`{${variable}}`}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Test Email */}
          <Card>
            <CardHeader>
              <CardTitle>Test Template</CardTitle>
              <CardDescription>Send a test email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test_email">Test Email Address</Label>
                <Input
                  id="test_email"
                  type="email"
                  placeholder="your-email@example.com"
                  className="test-email-input"
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const testEmail = (document.querySelector('.test-email-input') as HTMLInputElement)?.value;
                  if (!testEmail) {
                    toast.error('Please enter a test email address');
                    return;
                  }
                  try {
                    if (template.name && template.subject && template.html_content) {
                      await handleSave();
                    }
                    if (!isNew && template.id) {
                      const response = await apiClient.testEmailTemplate(template.id, testEmail);
                      if (response.success) {
                        toast.success('Test email sent!');
                      }
                    } else {
                      toast.error('Please save the template first');
                    }
                  } catch (error) {
                    toast.error('Failed to send test email');
                  }
                }}
              >
                <TestTube className="w-4 h-4 mr-2" />
                Send Test Email
              </Button>
            </CardContent>
          </Card>

          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle>Template Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <Badge>{selectedType?.label}</Badge>
              </div>
              {!isNew && template.id && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span>{template.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


