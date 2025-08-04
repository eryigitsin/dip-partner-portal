import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertRecipientAccountSchema, type RecipientAccount, type InsertRecipientAccount } from "@shared/schema";
import { Plus, Edit, Trash2, Building2, CreditCard, Check, X } from "lucide-react";

interface RecipientAccountsSectionProps {
  partnerId: number | undefined;
}

export function RecipientAccountsSection({ partnerId }: RecipientAccountsSectionProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<RecipientAccount | null>(null);

  const form = useForm<InsertRecipientAccount>({
    resolver: zodResolver(insertRecipientAccountSchema.extend({
      bankName: insertRecipientAccountSchema.shape.bankName.min(1, "Banka adı zorunludur"),
      accountHolderName: insertRecipientAccountSchema.shape.accountHolderName.min(1, "Alıcı adı zorunludur"),
      iban: insertRecipientAccountSchema.shape.iban.min(1, "IBAN zorunludur"),
    })),
    defaultValues: {
      partnerId: partnerId || 0,
      accountName: "",
      bankName: "",
      accountHolderName: "",
      accountNumber: "",
      iban: "",
      swiftCode: "",
      isDefault: false,
      isActive: true,
    },
  });

  // Fetch recipient accounts
  const { data: accounts = [], isLoading } = useQuery<RecipientAccount[]>({
    queryKey: ["/api/partner/recipient-accounts", partnerId],
    enabled: !!partnerId,
  });

  // Create/Update account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data: InsertRecipientAccount) => {
      const method = editingAccount ? 'PUT' : 'POST';
      const url = `/api/partner/recipient-accounts${editingAccount ? `/${editingAccount.id}` : ''}`;
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/recipient-accounts"] });
      setIsDialogOpen(false);
      setEditingAccount(null);
      form.reset();
      toast({
        title: "Başarılı",
        description: editingAccount ? "Hesap bilgileri güncellendi" : "Yeni hesap eklendi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Hesap kayıt edilirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await apiRequest('DELETE', `/api/partner/recipient-accounts/${accountId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/recipient-accounts"] });
      toast({
        title: "Başarılı",
        description: "Hesap silindi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Hesap silinirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Toggle default account mutation
  const toggleDefaultMutation = useMutation({
    mutationFn: async ({ accountId, isDefault }: { accountId: number; isDefault: boolean }) => {
      const response = await apiRequest('PATCH', `/api/partner/recipient-accounts/${accountId}/toggle-default`, { isDefault });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/recipient-accounts"] });
      toast({
        title: "Başarılı",
        description: "Varsayılan hesap güncellendi",
      });
    },
  });

  const onSubmit = (data: InsertRecipientAccount) => {
    createAccountMutation.mutate(data);
  };

  const handleEdit = (account: RecipientAccount) => {
    setEditingAccount(account);
    form.reset({
      partnerId: account.partnerId,
      accountName: account.accountName,
      bankName: account.bankName,
      accountHolderName: account.accountHolderName,
      accountNumber: account.accountNumber || "",
      iban: account.iban,
      swiftCode: account.swiftCode || "",
      isDefault: account.isDefault || false,
      isActive: account.isActive || true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (accountId: number) => {
    if (confirm("Bu hesabı silmek istediğinizden emin misiniz?")) {
      deleteAccountMutation.mutate(accountId);
    }
  };

  const handleAddNew = () => {
    setEditingAccount(null);
    form.reset({
      partnerId: partnerId || 0,
      accountName: "",
      bankName: "",
      accountHolderName: "",
      accountNumber: "",
      iban: "",
      swiftCode: "",
      isDefault: false,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  if (!partnerId) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            Müşterilerden ödeme alabilmek için hesap bilgilerinizi ekleyin
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} data-testid="button-add-account">
              <Plus className="w-4 h-4 mr-2" />
              Hesap Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Hesap Düzenle" : "Yeni Hesap Ekle"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="accountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hesap Adı <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ana Hesap" 
                            {...field} 
                            data-testid="input-account-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banka <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ziraat Bankası" 
                            {...field} 
                            data-testid="input-bank-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="accountHolderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alıcı Adı <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Şirket Adı veya Kişi Adı" 
                          {...field} 
                          data-testid="input-account-holder"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hesap No</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="123456789" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-account-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="swiftCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SWIFT Kodu</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="TCZBTR2A" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-swift-code"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="TR00 0000 0000 0000 0000 0000 00" 
                          {...field} 
                          data-testid="input-iban"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Varsayılan Hesap</FormLabel>
                        <div className="text-sm text-gray-600">
                          Bu hesabı varsayılan olarak ayarla
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="switch-default-account"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    İptal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAccountMutation.isPending}
                    data-testid="button-save-account"
                  >
                    {createAccountMutation.isPending 
                      ? "Kaydediliyor..." 
                      : editingAccount ? "Güncelle" : "Kaydet"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Hesaplar yükleniyor...</div>
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Henüz hesap bilgisi eklenmemiş
              </h3>
              <p className="text-gray-600 mb-4">
                Müşterilerden ödeme alabilmek için hesap bilgilerinizi ekleyin
              </p>
              <Button onClick={handleAddNew} data-testid="button-add-first-account">
                <Plus className="w-4 h-4 mr-2" />
                İlk Hesabını Ekle
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hesap Adı</TableHead>
                  <TableHead>Banka</TableHead>
                  <TableHead>Alıcı Adı</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account: RecipientAccount) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{account.accountName}</span>
                        {account.isDefault && (
                          <Badge variant="default" className="text-xs">
                            Varsayılan
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{account.bankName}</TableCell>
                    <TableCell>{account.accountHolderName}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {account.iban}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? "default" : "secondary"}>
                        {account.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(account)}
                          data-testid={`button-edit-account-${account.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDefaultMutation.mutate({ 
                            accountId: account.id, 
                            isDefault: !account.isDefault 
                          })}
                          disabled={toggleDefaultMutation.isPending}
                          data-testid={`button-toggle-default-${account.id}`}
                        >
                          {account.isDefault ? (
                            <X className="w-4 h-4 text-red-500" />
                          ) : (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(account.id)}
                          disabled={deleteAccountMutation.isPending}
                          className="text-red-500 hover:text-red-700"
                          data-testid={`button-delete-account-${account.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}