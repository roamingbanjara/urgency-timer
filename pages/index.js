import React, { useState, useEffect } from 'react';
import { 
  Page, 
  Layout, 
  Card, 
  Banner, 
  Button, 
  ProgressBar,
  Text,
  TextStyle,
  Stack,
  Select,
  ColorPicker,
  TextField,
  Divider
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import Cookies from 'js-cookie';
import axios from 'axios';
import gql from 'graphql-tag';
import { useQuery, useMutation } from '@apollo/react-hooks';

const GET_SHOP_STATS = gql`
  query {
    shop {
      myshopifyDomain
    }
  }
`;

function Index() {
  const shopOrigin = Cookies.get('shopOrigin');
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState({
    timer_color: '#FF0000',
    timer_position: 'top',
    timer_template: 1,
    font_size: 16
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: shopData } = useQuery(GET_SHOP_STATS);

  useEffect(() => {
    fetchStats();
    fetchSettings();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`/api/dashboard/stats?shop=${shopOrigin}`);
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`/api/dashboard/settings?shop=${shopOrigin}`);
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.post(`/api/dashboard/settings`, {
        shop: shopOrigin,
        ...settings
      });
      setSaving(false);
      // Show success message
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaving(false);
    }
  };

  const handleActivate = () => {
    window.location.href = `/api/billing/activate?shop=${shopOrigin}`;
  };

  if (loading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <Text>Loading...</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const FREE_LIMIT = 1000;
  const viewsUsed = stats?.total_views || 0;
  const viewsRemaining = Math.max(0, FREE_LIMIT - viewsUsed);
  const isLocked = viewsUsed >= FREE_LIMIT && !stats?.is_paid;
  const progress = (viewsUsed / FREE_LIMIT) * 100;
  const viewsUntilLock = FREE_LIMIT - viewsUsed;

  const positionOptions = [
    { label: 'Top of Page', value: 'top' },
    { label: 'Bottom of Page', value: 'bottom' },
    { label: 'Floating (Bottom Right)', value: 'floating' }
  ];

  const templateOptions = [
    { label: 'Template 1: Scarcity', value: 1 },
    { label: 'Template 2: Sale Ending', value: 2 },
    { label: 'Template 3: Social Proof', value: 3 },
    { label: 'Template 4: Low Inventory', value: 4 }
  ];

  return (
    <Page>
      <TitleBar title="Urgency Timer" />
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Stack vertical spacing="loose">
              <Text variant="headingXl" as="h1">
                Your urgency engine is running…
              </Text>
              
              {isLocked ? (
                <Banner status="critical" title="Free plan limit reached">
                  <p>
                    You've used all {FREE_LIMIT} free product views. Activate a plan to continue boosting conversions.
                  </p>
                  <Button primary onClick={handleActivate}>
                    Activate Plan
                  </Button>
                </Banner>
              ) : (
                <Banner status="info">
                  <Stack vertical spacing="tight">
                    <Text variant="headingMd" as="h2">
                      Views Used: {viewsUsed} / {FREE_LIMIT}
                    </Text>
                    <ProgressBar progress={progress} size="large" />
                    <Text>
                      {viewsRemaining} views remaining before lock
                    </Text>
                    {viewsUntilLock <= 100 && (
                      <TextStyle variation="strong">
                        ⚠️ Only {viewsUntilLock} views left! Activate now to avoid interruption.
                      </TextStyle>
                    )}
                  </Stack>
                </Banner>
              )}

              {stats?.is_paid && (
                <Banner status="success" title="Active Plan">
                  <p>
                    You're on the <TextStyle variation="strong">{stats.plan_name}</TextStyle> plan. 
                    Your timer is active and boosting conversions!
                  </p>
                </Banner>
              )}

              <Divider />

              <Text variant="headingLg" as="h2">
                Quick Customization
              </Text>
              <Text color="subdued">
                Customize your timer in 3 clicks or less
              </Text>

              <Stack vertical spacing="tight">
                <Select
                  label="Timer Position"
                  options={positionOptions}
                  value={settings.timer_position}
                  onChange={(value) => setSettings({ ...settings, timer_position: value })}
                />

                <Select
                  label="Timer Template"
                  options={templateOptions}
                  value={settings.timer_template.toString()}
                  onChange={(value) => setSettings({ ...settings, timer_template: parseInt(value) })}
                />

                <div>
                  <Text as="p" variant="bodyMd" color="subdued">
                    Timer Color
                  </Text>
                  <input
                    type="color"
                    value={settings.timer_color}
                    onChange={(e) => setSettings({ ...settings, timer_color: e.target.value })}
                    style={{ width: '100px', height: '40px', marginTop: '8px' }}
                  />
                </div>

                <TextField
                  label="Font Size"
                  type="number"
                  value={settings.font_size.toString()}
                  onChange={(value) => setSettings({ ...settings, font_size: parseInt(value) || 16 })}
                  min={12}
                  max={24}
                />

                <Button 
                  primary 
                  onClick={saveSettings} 
                  loading={saving}
                  disabled={saving}
                >
                  Save Settings
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Layout.Section>

        <Layout.Section secondary>
          <Card sectioned title="How It Works">
            <Stack vertical spacing="tight">
              <Text>
                <TextStyle variation="strong">Zero Setup:</TextStyle> The timer automatically appears on all product pages.
              </Text>
              <Text>
                <TextStyle variation="strong">Free Trial:</TextStyle> {FREE_LIMIT} product views to prove value.
              </Text>
              <Text>
                <TextStyle variation="strong">Auto-Lock:</TextStyle> Timer locks after {FREE_LIMIT} views until you activate.
              </Text>
              <Text>
                <TextStyle variation="strong">Conversion Boost:</TextStyle> Creates urgency that increases sales.
              </Text>
            </Stack>
          </Card>

          {!stats?.is_paid && (
            <Card sectioned title="Plans">
              <Stack vertical spacing="tight">
                <div>
                  <TextStyle variation="strong">Starter - $19/mo</TextStyle>
                  <Text>5,000 views/month</Text>
                </div>
                <div>
                  <TextStyle variation="strong">Growth - $49/mo</TextStyle>
                  <Text>50,000 views/month</Text>
                </div>
                <div>
                  <TextStyle variation="strong">Unlimited - $99/mo</TextStyle>
                  <Text>Unlimited views</Text>
                </div>
                <Button primary onClick={handleActivate}>
                  Activate Plan
                </Button>
              </Stack>
            </Card>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default Index;
