import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TestUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);
    formData.append('description', 'test description');

    console.log('Uploading file:', file.name, file.size, file.type);
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }

    try {
      const res = await fetch('/api/partners/1', {
        method: 'PATCH',
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();
      console.log('Response:', res.status, data);
      setResponse(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Test Upload</h1>
      
      <div className="space-y-4">
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
        
        <Button onClick={handleUpload} disabled={!file}>
          Upload Test
        </Button>
        
        {response && (
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(response, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}