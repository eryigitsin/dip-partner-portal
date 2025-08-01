import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ServiceAutocompleteProps {
  partnerServices: string[];
  partnerId: number;
  value: string;
  onChange: (value: string) => void;
  onServiceSelect?: (serviceName: string) => void;
  placeholder?: string;
  className?: string;
}

export function ServiceAutocomplete({
  partnerServices,
  partnerId,
  value,
  onChange,
  onServiceSelect,
  placeholder,
  className
}: ServiceAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredServices, setFilteredServices] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (value.length > 0) {
      const filtered = partnerServices.filter(service =>
        service.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredServices(filtered);
    } else {
      setFilteredServices(partnerServices);
    }
  }, [value, partnerServices]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    setIsOpen(inputValue.length > 0);
  };

  const handleServiceSelect = (service: string) => {
    onChange(service);
    onServiceSelect?.(service);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    if (partnerServices.length > 0) {
      setIsOpen(true);
    }
  };

  // Add new service mutation
  const addServiceMutation = useMutation({
    mutationFn: async (serviceName: string) => {
      // First add to global services pool
      const serviceResponse = await apiRequest('POST', '/api/services', {
        name: serviceName,
        description: `${serviceName} hizmeti`,
        categoryId: null // Will be categorized later by admin
      });
      
      const newService = await serviceResponse.json();
      
      // Then add to partner's selected services
      await apiRequest('POST', `/api/partners/${partnerId}/services`, {
        serviceId: newService.id
      });
      
      return newService;
    },
    onSuccess: (newService) => {
      // Refresh partner services
      queryClient.invalidateQueries({ queryKey: [`/api/partners/${partnerId}/services`] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      
      toast({
        title: 'Başarılı',
        description: `"${newService.name}" hizmeti eklendi ve profilinize dahil edildi`,
      });
      
      // Select the newly added service
      onChange(newService.name);
      onServiceSelect?.(newService.name);
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Hizmet eklenirken bir hata oluştu',
        variant: 'destructive',
      });
    },
  });

  // Check if current value is not in existing services (new service)
  const isNewService = value.trim().length > 0 && 
    !partnerServices.some(service => 
      service.toLowerCase() === value.toLowerCase()
    );

  const handleAddNewService = () => {
    if (isNewService && value.trim()) {
      addServiceMutation.mutate(value.trim());
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Input
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        className="pr-8"
      />
      
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          onClick={() => onChange("")}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {isOpen && (filteredServices.length > 0 || isNewService) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredServices.map((service, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-sm"
              onClick={() => handleServiceSelect(service)}
            >
              {service}
            </button>
          ))}
          
          {isNewService && (
            <button
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm border-t border-gray-100 text-blue-600 font-medium"
              onClick={handleAddNewService}
              disabled={addServiceMutation.isPending}
            >
              <div className="flex items-center gap-2">
                {addServiceMutation.isPending ? (
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>"{value}" hizmetini ekle</span>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ServiceAutocomplete;