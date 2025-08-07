import { useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SecureInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  validateSql?: boolean;
  validateXss?: boolean;
  maxLength?: number;
}

export const SecureInput: React.FC<SecureInputProps> = ({
  value,
  onChange,
  validateSql = true,
  validateXss = true,
  maxLength = 1000,
  className,
  ...props
}) => {
  const [error, setError] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);

  const validateInput = useCallback((inputValue: string): { isValid: boolean; error: string } => {
    // Length check
    if (inputValue.length > maxLength) {
      return { isValid: false, error: `Input too long. Maximum ${maxLength} characters allowed.` };
    }

    // SQL injection pattern check
    if (validateSql) {
      const sqlPatterns = [
        /(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE|EXEC|EXECUTE)\s/i,
        /('|(\\)|;|--|\/\*|\*\/)/i,
        /(script|javascript|vbscript|onload|onerror|onclick)/i
      ];
      
      for (const pattern of sqlPatterns) {
        if (pattern.test(inputValue)) {
          return { isValid: false, error: 'Invalid characters detected. Please remove special characters.' };
        }
      }
    }

    // XSS pattern check
    if (validateXss) {
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<object[^>]*>.*?<\/object>/gi,
        /<embed[^>]*>/gi,
        /<applet[^>]*>.*?<\/applet>/gi
      ];

      for (const pattern of xssPatterns) {
        if (pattern.test(inputValue)) {
          return { isValid: false, error: 'Invalid content detected. HTML/Script tags are not allowed.' };
        }
      }
    }

    return { isValid: true, error: '' };
  }, [validateSql, validateXss, maxLength]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // Sanitize the input
    if (validateXss) {
      inputValue = DOMPurify.sanitize(inputValue, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
    }

    // Validate the input
    const validation = validateInput(inputValue);
    setError(validation.error);
    setIsValid(validation.isValid);

    // Only call onChange if input is valid
    if (validation.isValid) {
      onChange(inputValue);
    }
  }, [onChange, validateInput, validateXss]);

  return (
    <div className="space-y-2">
      <Input
        {...props}
        value={value}
        onChange={handleChange}
        className={`${className} ${!isValid ? 'border-red-500' : ''}`}
        data-testid="secure-input"
      />
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SecureInput;