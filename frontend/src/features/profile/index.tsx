import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
} from '@/components/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAppSelector } from 'src/app/hooks';
import { getLoggedInUser } from '../auth/authSlice';

const ProfilePage = () => {
  const user = useAppSelector(getLoggedInUser);

  return (
    <PageLayout
      header={<PageHeader>Profile</PageHeader>}
      subheader={
        <PageSubHeader>
          Manage your account settings and preferences
        </PageSubHeader>
      }
    >
      <PageContent>
        <Tabs defaultValue="profile" className="w-full space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-8 lg:w-[360px]">
            <TabsTrigger value="profile" className="text-[12px]">
              Profile
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-[12px]">
              Settings
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-[12px]">
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-[13px]">
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-[12px] font-mono">
                      {user?.name
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5 text-center sm:text-left">
                    <h3 className="text-[15px] font-semibold">{user?.name}</h3>
                    <p className="text-[12px] text-muted-foreground font-mono">
                      {user?.email}
                    </p>
                    <Badge
                      variant={user?.is_admin ? 'default' : 'secondary'}
                      className="text-[10px] h-5 px-1.5"
                    >
                      {user?.is_admin ? 'Admin' : 'User'}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 pt-3 mt-3 border-t border-border/40">
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="name"
                      className="text-[11px] uppercase tracking-wider text-muted-foreground"
                    >
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      defaultValue={user?.name}
                      className="h-8 text-[12px]"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="email"
                      className="text-[11px] uppercase tracking-wider text-muted-foreground"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      defaultValue={user?.email}
                      className="h-8 text-[12px]"
                    />
                  </div>
                  <Button className="h-8 text-[12px]">Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-[13px]">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <div className="space-y-0.5">
                    <Label className="text-[12px]">
                      Two-Factor Authentication
                    </Label>
                    <p className="text-[11px] text-muted-foreground/60">
                      Add an extra layer of security
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="space-y-0.5">
                    <Label className="text-[12px]">Email Notifications</Label>
                    <p className="text-[11px] text-muted-foreground/60">
                      Receive email updates about your account
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-[13px]">
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <div className="space-y-0.5">
                    <Label className="text-[12px]">Price Alerts</Label>
                    <p className="text-[11px] text-muted-foreground/60">
                      Get notified when prices change significantly
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="space-y-0.5">
                    <Label className="text-[12px]">Trading Updates</Label>
                    <p className="text-[11px] text-muted-foreground/60">
                      Receive updates about your trading activity
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageLayout>
  );
};

export default ProfilePage;
