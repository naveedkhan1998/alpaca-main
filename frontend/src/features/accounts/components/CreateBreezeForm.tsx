import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2, Check } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
} from '@/components/PageLayout';
import { useCreateBreezeMutation } from '@/api/breezeServices';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  api_key: z.string().min(1, 'API Key is required'),
  api_secret: z.string().min(1, 'API Secret is required'),
  session_token: z.string().optional(),
  is_active: z.boolean().default(true),
});

const CreateBreezeForm = () => {
  const [createBreeze, { isLoading }] = useCreateBreezeMutation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      api_key: '',
      api_secret: '',
      session_token: '',
      is_active: true,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createBreeze(values).unwrap();
      toast.success('Breeze account created successfully!');
      form.reset();
      window.location.reload();
    } catch (error) {
      toast.error('Failed to create breeze account.');
      console.error('Failed to create breeze account:', error);
    }
  };

  return (
    <PageLayout
      header={
        <PageHeader>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text">
            Setup Breeze Account
          </span>
        </PageHeader>
      }
      subheader={
        <PageSubHeader>
          Create your ICICI Direct Breeze account to get started
        </PageSubHeader>
      }
    >
      <PageContent>
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <Card>
              <CardHeader>
                <CardTitle>Account Setup</CardTitle>
                <CardDescription>
                  Enter your ICICI Direct API credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., My Trading Account"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="api_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your API key"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="api_secret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Secret</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your API secret"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3 space-y-0 border rounded-lg">
                          <div className="space-y-0.5">
                            <FormLabel>Activate Account</FormLabel>
                            <FormDescription>
                              Enable this account immediately
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Create Account
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default CreateBreezeForm;
