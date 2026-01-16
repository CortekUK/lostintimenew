import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Repeat, User, Phone, Calendar, PoundSterling, FileText, CheckCircle2, Package, ArrowRight, ExternalLink } from 'lucide-react';
import { usePartExchangesByProduct } from '@/hooks/usePartExchanges';
import { formatCurrency } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';

interface PartExchangeInfoTabProps {
  productId: number;
}

export function PartExchangeInfoTab({ productId }: PartExchangeInfoTabProps) {
  const navigate = useNavigate();
  const { data: partExchange, isLoading, error } = usePartExchangesByProduct(productId);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  // If this product wasn't from a trade-in, show empty state
  if (!partExchange) {
    return (
      <div className="text-center py-8">
        <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Not a Trade-In Item</h3>
        <p className="text-muted-foreground">
          This product was not acquired through a part exchange or trade-in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Trade-In Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Step 1: Received */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-primary/10 p-2">
                  <Repeat className="h-4 w-4 text-primary" />
                </div>
                <div className="w-px h-full bg-border mt-2" />
              </div>
              <div className="flex-1 pb-4">
                <h4 className="font-medium text-sm">Received as Trade-In</h4>
                <p className="text-xs text-muted-foreground">
                  {partExchange.sale?.sold_at && new Date(partExchange.sale.sold_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Trade-in allowance: {formatCurrency(Number(partExchange.allowance))}
                </p>
              </div>
            </div>

            {/* Step 2: Converted */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-success/10 p-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div className="w-px h-8 bg-border mt-2" />
              </div>
              <div className="flex-1 pb-4">
                <h4 className="font-medium text-sm">Converted to Inventory</h4>
                <p className="text-xs text-muted-foreground">Now available for sale</p>
              </div>
            </div>

            {/* Step 3: Current Status */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-primary/10 p-2">
                  <Package className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">Current Status</h4>
                <Badge variant="outline" className="mt-1">In Stock</Badge>
              </div>
            </div>
          </div>

          {/* Link to intake queue */}
          <div className="mt-6 pt-4 border-t space-y-2">
            {partExchange.sale_id && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => navigate(`/sales/${partExchange.sale_id}`)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Original Sale
              </Button>
            )}
            <Link to="/products/intake">
              <Button variant="outline" size="sm" className="w-full">
                <Repeat className="h-4 w-4 mr-2" />
                View All Trade-Ins
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Part Exchange Summary */}
      <Card className="shadow-sm border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-amber-800">
            <Repeat className="h-4 w-4" />
            Trade-In Information
            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
              Part Exchange
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Information */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Details
              </h4>
              
              <div className="space-y-2 pl-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">
                    {partExchange.customer_name || (
                      <span className="text-muted-foreground italic">Not recorded</span>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact:</span>
                  <span className="font-medium font-mono">
                    {partExchange.customer_contact || (
                      <span className="text-muted-foreground italic">Not recorded</span>
                    )}
                  </span>
                </div>
                
                {(!partExchange.customer_name && !partExchange.customer_contact) && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                    This is a legacy trade-in from before customer details were tracked.
                  </div>
                )}
              </div>
            </div>

            {/* Trade-In Details */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <PoundSterling className="h-4 w-4" />
                Trade-In Details
              </h4>
              
              <div className="space-y-2 pl-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Allowance:</span>
                  <span className="font-medium text-success">
                    {formatCurrency(Number(partExchange.allowance))}
                  </span>
                </div>
                
                {partExchange.sale?.sold_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {new Date(partExchange.sale.sold_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {partExchange.notes && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                Notes
              </h4>
              <p className="text-sm text-muted-foreground pl-6">
                {partExchange.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• This item was accepted as part of a customer trade-in transaction</p>
            <p>• All trade-in items are thoroughly inspected and authenticated before acceptance</p>
            <p>• Customer contact information is kept for reference and warranty purposes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}