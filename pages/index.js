import React, { useState, useEffect } from 'react';
import { 
  Page, 
  Layout, 
  Card, 
  Banner, 
  Button, 
  ProgressBar,
  Stack,
  Select,
  TextField
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
              <span>Loading...</span>
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
              <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '16px' }}>
                Your urgency engine is running…
              </h1>
              
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
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                      Views Used: {viewsUsed} / {FREE_LIMIT}
                    </h2>
                    <ProgressBar progress={progress} size="large" />
                    <span>
                      {viewsRemaining} views remaining before lock
                    </span>
                    {viewsUntilLock <= 100 && (
                      <strong>
                        ⚠️ Only {viewsUntilLock} views left! Activate now to avoid interruption.
                      </strong>
                    )}
                  </Stack>
                </Banner>
              )}

              {stats?.is_paid && (
                <Banner status="success" title="Active Plan">
                  <p>
                    You're on the <strong>{stats.plan_name}</strong> plan. 
                    Your timer is active and boosting conversions!
                  </p>
                </Banner>
              )}

              <div style={{ 
                borderTop: '1px solid #e1e3e5', 
                marginTop: '24px', 
                marginBottom: '24px' 
              }} />

              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                Quick Customization
              </h2>
              <span style={{ color: '#6d7175' }}>
                Customize your timer in 3 clicks or less
              </span>

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
                  <p style={{ color: '#6d7175', marginBottom: '8px' }}>
                    Timer Color
                  </p>
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
              <span>
                <strong>Zero Setup:</strong> The timer automatically appears on all product pages.
              </span>
              <span>
                <strong>Free Trial:</strong> {FREE_LIMIT} product views to prove value.
              </span>
              <span>
                <strong>Auto-Lock:</strong> Timer locks after {FREE_LIMIT} views until you activate.
              </span>
              <span>
                <strong>Conversion Boost:</strong> Creates urgency that increases sales.
              </span>
            </Stack>
          </Card>

          {!stats?.is_paid && (
            <Card sectioned title="Plans">
              <Stack vertical spacing="tight">
                <div>
                  <strong>Starter - $19/mo</strong>
                  <span style={{ display: 'block', marginTop: '4px' }}>5,000 views/month</span>
                </div>
                <div>
                  <strong>Growth - $49/mo</strong>
                  <span style={{ display: 'block', marginTop: '4px' }}>50,000 views/month</span>
                </div>
                <div>
                  <strong>Unlimited - $99/mo</strong>
                  <span style={{ display: 'block', marginTop: '4px' }}>Unlimited views</span>
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
