import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ServiceAutocompleteProps {
  partnerServices: string[];
  allServices?: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ServiceAutocomplete({
  partnerServices,
  allServices = [],
  value,
  onChange,
  placeholder,
  className
}: ServiceAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredServices, setFilteredServices] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length > 0) {
      // Combine partner services and all services for filtering
      const allServicesList = [...new Set([...partnerServices, ...allServices])];
      const filtered = allServicesList.filter(service =>
        service.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredServices(filtered);
    } else {
      // Show partner services first, then all services
      const combined = [...partnerServices, ...allServices.filter(s => !partnerServices.includes(s))];
      setFilteredServices(combined);
    }
  }, [value, partnerServices, allServices]);

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
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    if (partnerServices.length > 0 || allServices.length > 0) {
      setIsOpen(true);
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

      {isOpen && filteredServices.length > 0 && (
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
        </div>
      )}
    </div>
  );
}

export default ServiceAutocomplete;