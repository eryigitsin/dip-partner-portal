import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Zap,
  HardDrive,
  Cpu,
  MemoryStick,
  Globe,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface SystemMetric {
  name: string;
  value: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: string;
  lastChecked: string;
}

interface PerformanceData {
  timestamp: string;
  cpu: number;
  memory: number;
  database: number;
  response: number;
}

export default function SystemStatus() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data - in real app this would come from monitoring APIs
  const systemMetrics: SystemMetric[] = [
    {
      name: 'Web Server',
      value: '99.98%',
      status: 'operational',
      uptime: '99.98%',
      lastChecked: '2 dakika önce'
    },
    {
      name: 'Database',
      value: '99.95%',
      status: 'operational',
      uptime: '99.95%',
      lastChecked: '1 dakika önce'
    },
    {
      name: 'API Gateway',
      value: '99.99%',
      status: 'operational',
      uptime: '99.99%',
      lastChecked: '30 saniye önce'
    },
    {
      name: 'Email Service',
      value: '98.50%',
      status: 'degraded',
      uptime: '98.50%',
      lastChecked: '5 dakika önce'
    },
    {
      name: 'SMS Service',
      value: '99.80%',
      status: 'operational',
      uptime: '99.80%',
      lastChecked: '2 dakika önce'
    },
    {
      name: 'CDN',
      value: '100%',
      status: 'operational',
      uptime: '100%',
      lastChecked: '1 dakika önce'
    }
  ];

  const performanceData: PerformanceData[] = [
    { timestamp: '00:00', cpu: 45, memory: 62, database: 23, response: 150 },
    { timestamp: '02:00', cpu: 52, memory: 58, database: 28, response: 165 },
    { timestamp: '04:00', cpu: 38, memory: 65, database: 31, response: 142 },
    { timestamp: '06:00', cpu: 67, memory: 71, database: 45, response: 189 },
    { timestamp: '08:00', cpu: 78, memory: 82, database: 52, response: 201 },
    { timestamp: '10:00', cpu: 85, memory: 88, database: 48, response: 195 },
    { timestamp: '12:00', cpu: 72, memory: 75, database: 39, response: 178 },
    { timestamp: '14:00', cpu: 69, memory: 79, database: 42, response: 186 },
    { timestamp: '16:00', cpu: 81, memory: 85, database: 55, response: 203 },
    { timestamp: '18:00', cpu: 76, memory: 81, database: 49, response: 192 },
    { timestamp: '20:00', cpu: 63, memory: 74, database: 36, response: 171 },
    { timestamp: '22:00', cpu: 55, memory: 68, database: 29, response: 158 }
  ];

  const recentIncidents = [
    {
      id: 1,
      title: 'Email Delivery Gecikmeleri',
      description: 'Email servisinde geçici gecikmeler yaşanıyor.',
      status: 'investigating',
      severity: 'minor',
      startTime: '2024-01-27 14:30',
      duration: '2 saat 15 dakika',
      affectedServices: ['Email Service']
    },
    {
      id: 2,
      title: 'Database Yavaşlığı',
      description: 'Veritabanı sorgularında yavaşlık gözlemlendi.',
      status: 'resolved',
      severity: 'minor',
      startTime: '2024-01-26 09:15',
      duration: '45 dakika',
      affectedServices: ['Database', 'API Gateway']
    },
    {
      id: 3,
      title: 'CDN Kesintisi',
      description: 'CDN servisi geçici olarak erişilemez durumda.',
      status: 'resolved',
      severity: 'major',
      startTime: '2024-01-25 16:20',
      duration: '1 saat 30 dakika',
      affectedServices: ['CDN', 'Web Server']
    }
  ];

  const errorLogs = [
    {
      timestamp: '2024-01-27 15:45:32',
      level: 'error',
      service: 'Auth Service',
      message: 'Failed to authenticate user with token: invalid_token',
      count: 3
    },
    {
      timestamp: '2024-01-27 15:42:18',
      level: 'warning',
      service: 'Email Service',
      message: 'SMTP connection timeout, retrying...',
      count: 7
    },
    {
      timestamp: '2024-01-27 15:38:45',
      level: 'error',
      service: 'Database',
      message: 'Connection pool exhausted, waiting for available connection',
      count: 2
    },
    {
      timestamp: '2024-01-27 15:35:12',
      level: 'info',
      service: 'API Gateway',
      message: 'Rate limit exceeded for IP: 192.168.1.100',
      count: 12
    },
    {
      timestamp: '2024-01-27 15:30:56',
      level: 'warning',
      service: 'File Upload',
      message: 'Large file upload detected: 15MB',
      count: 1
    }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Kritik</Badge>;
      case 'major':
        return <Badge variant="destructive" className="bg-orange-500">Büyük</Badge>;
      case 'minor':
        return <Badge variant="secondary">Küçük</Badge>;
      default:
        return <Badge variant="outline">Bilgi</Badge>;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (user?.userType !== 'master_admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Erişim Reddedildi</h1>
            <p className="text-gray-600 mt-2">Bu sayfaya erişim yetkiniz bulunmuyor.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistem Durumu</h1>
            <p className="text-gray-600">Platform sağlığını ve performansını izleyin.</p>
          </div>
          <Button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>

        {/* Overall Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Tüm Sistemler Çalışıyor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Son güncelleme: {new Date().toLocaleString('tr-TR')} • 
              Ortalama uptime: 99.87% • 
              Ortalama yanıt süresi: 178ms
            </p>
          </CardContent>
        </Card>

        {/* System Services */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sistem Servisleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemMetrics.map((metric) => (
                <div key={metric.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(metric.status)}`} />
                    <div>
                      <p className="font-medium">{metric.name}</p>
                      <p className="text-sm text-gray-500">Uptime: {metric.uptime}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusIcon(metric.status)}
                    <p className="text-xs text-gray-500 mt-1">{metric.lastChecked}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Sistem Performansı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="cpu" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="memory" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Yanıt Süreleri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="response" stroke="#ff7300" strokeWidth={2} />
                  <Line type="monotone" dataKey="database" stroke="#00c49f" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Current Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Kullanımı</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">76%</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
                +5% son saatten
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bellek Kullanımı</CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">81%</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
                -2% son saatten
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disk Kullanımı</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45%</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-yellow-500" />
                +1% son saatten
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Bağlantı</CardTitle>
              <Wifi className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,247</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +12% son saatten
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Incidents */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Son Olaylar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{incident.title}</h3>
                      {getSeverityBadge(incident.severity)}
                      <Badge variant={incident.status === 'resolved' ? 'default' : 'secondary'}>
                        {incident.status === 'resolved' ? 'Çözüldü' : 
                         incident.status === 'investigating' ? 'İnceleniyor' : 'Açık'}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-2">{incident.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {incident.startTime}
                      </span>
                      <span>Süre: {incident.duration}</span>
                      <span>Etkilenen: {incident.affectedServices.join(', ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Son Sistem Logları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {errorLogs.map((log, index) => (
                <div key={index} className="flex items-start justify-between p-3 border-l-4 border-l-gray-200 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={getLogLevelColor(log.level)}>
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium">{log.service}</span>
                      <span className="text-xs text-gray-500">{log.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-700">{log.message}</p>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {log.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}