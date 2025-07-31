import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Eye, User, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface ServiceTagProps {
  serviceName: string;
  serviceId: number;
  variant?: 'default' | 'secondary' | 'outline';
  size?: 'sm' | 'default' | 'lg';
}

export function ServiceTag({ serviceName, serviceId, variant = 'default', size = 'default' }: ServiceTagProps) {
  const [showProviders, setShowProviders] = useState(false);

  const { data: serviceProviders, isLoading } = useQuery({
    queryKey: ['/api/services', serviceId, 'providers'],
    enabled: showProviders,
  });

  return (
    <>
      <Badge 
        variant={variant} 
        className={`cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors ${
          size === 'sm' ? 'text-xs px-2 py-1' : 
          size === 'lg' ? 'text-sm px-3 py-2' : 'text-sm px-2 py-1'
        }`}
        onClick={() => setShowProviders(true)}
      >
        {serviceName}
      </Badge>

      <Dialog open={showProviders} onOpenChange={setShowProviders}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {serviceName} Hizmeti Sunan Partnerler
            </DialogTitle>
            <DialogDescription>
              Bu hizmeti sunan tüm partner firmaların listesi
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {isLoading ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                Yükleniyor...
              </div>
            ) : serviceProviders?.length > 0 ? (
              serviceProviders.map((partner: any) => (
                <Card key={partner.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {partner.logo ? (
                        <img 
                          src={partner.logo} 
                          alt={partner.companyName}
                          className="w-12 h-12 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {partner.companyName}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {partner.serviceCategory}
                        </p>
                        
                        {partner.city && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                            <MapPin className="h-3 w-3" />
                            <span>{partner.city}</span>
                          </div>
                        )}

                        {partner.shortDescription && (
                          <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                            {partner.shortDescription}
                          </p>
                        )}

                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            window.open(`/partner/${partner.username}`, '_blank');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Profili Gör
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                Bu hizmeti sunan partner bulunmamaktadır.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}