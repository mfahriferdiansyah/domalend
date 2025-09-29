import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Clock, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface Loan {
  loanId: string;
  domainName: string;
  domainTokenId: string;
  principal: number;
  currentBalance: number;
  interestRate: number;
  dueDate: string;
  status: 'active' | 'overdue' | 'defaulted' | 'repaid';
  collateralValue: number;
  ltvRatio: number;
  monthlyPayment: number;
  nextPaymentDue: string;
}

const LoansPage: NextPage = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now - will be replaced with API call
    const mockLoans: Loan[] = [
      {
        loanId: '1',
        domainName: 'example.com',
        domainTokenId: '1',
        principal: 3500,
        currentBalance: 2800,
        interestRate: 12,
        dueDate: '2024-12-15',
        status: 'active',
        collateralValue: 5000,
        ltvRatio: 70,
        monthlyPayment: 320,
        nextPaymentDue: '2024-10-15'
      },
      {
        loanId: '2',
        domainName: 'crypto.org',
        domainTokenId: '2',
        principal: 6375,
        currentBalance: 6500,
        interestRate: 15,
        dueDate: '2024-10-01',
        status: 'overdue',
        collateralValue: 8500,
        ltvRatio: 75,
        monthlyPayment: 580,
        nextPaymentDue: '2024-09-01'
      },
      {
        loanId: '3',
        domainName: 'defi.io',
        domainTokenId: '3',
        principal: 2240,
        currentBalance: 0,
        interestRate: 10,
        dueDate: '2024-08-30',
        status: 'repaid',
        collateralValue: 3200,
        ltvRatio: 70,
        monthlyPayment: 205,
        nextPaymentDue: 'N/A'
      }
    ];
    
    setLoans(mockLoans);
    setLoading(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-orange-100 text-orange-800';
      case 'defaulted': return 'bg-red-100 text-red-800';
      case 'repaid': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      case 'active': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  const filteredLoans = loans.filter(loan => {
    switch (activeTab) {
      case 'active': return loan.status === 'active';
      case 'overdue': return loan.status === 'overdue' || loan.status === 'defaulted';
      case 'repaid': return loan.status === 'repaid';
      case 'all': return true;
      default: return true;
    }
  });

  const totalActiveLoans = loans.filter(l => l.status === 'active').length;
  const totalOverdue = loans.filter(l => l.status === 'overdue' || l.status === 'defaulted').length;
  const totalBorrowed = loans.reduce((sum, loan) => sum + loan.principal, 0);
  const totalOutstanding = loans.filter(l => l.status === 'active' || l.status === 'overdue')
    .reduce((sum, loan) => sum + loan.currentBalance, 0);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Loans</h1>
        <p className="text-gray-600">Manage your active loans and payment history</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Loans</p>
                <p className="text-2xl font-bold">{totalActiveLoans}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-orange-600">{totalOverdue}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Borrowed</p>
                <p className="text-2xl font-bold">${totalBorrowed.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold">${totalOutstanding.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loans List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active ({loans.filter(l => l.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({totalOverdue})</TabsTrigger>
          <TabsTrigger value="repaid">Repaid ({loans.filter(l => l.status === 'repaid').length})</TabsTrigger>
          <TabsTrigger value="all">All ({loans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="space-y-4">
            {filteredLoans.map((loan) => (
              <Card key={loan.loanId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Link href={`/domain/${loan.domainTokenId}`} className="hover:underline">
                          {loan.domainName}
                        </Link>
                        {getStatusIcon(loan.status)}
                      </CardTitle>
                      <p className="text-sm text-gray-600">Loan ID: {loan.loanId}</p>
                    </div>
                    <Badge className={getStatusColor(loan.status)}>
                      {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Loan Details */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Loan Details</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Principal:</span>
                          <span>${loan.principal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Balance:</span>
                          <span className="font-semibold">${loan.currentBalance.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Interest Rate:</span>
                          <span>{loan.interestRate}% APR</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Due Date:</span>
                          <span>{new Date(loan.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Collateral Info */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Collateral</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Value:</span>
                          <span>${loan.collateralValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">LTV Ratio:</span>
                          <span>{loan.ltvRatio}%</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Health Factor</span>
                          <span>{(100 - loan.ltvRatio)}% safe</span>
                        </div>
                        <Progress value={100 - loan.ltvRatio} className="h-2" />
                      </div>
                    </div>

                    {/* Payment Info & Actions */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Payment</h4>
                      {loan.status !== 'repaid' && (
                        <>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Monthly Payment:</span>
                              <span>${loan.monthlyPayment.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Next Due:</span>
                              <span>{new Date(loan.nextPaymentDue).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="space-y-2 mt-4">
                            <Button className="w-full" size="sm">
                              Make Payment
                            </Button>
                            <Button variant="outline" className="w-full" size="sm">
                              View Details
                            </Button>
                          </div>
                        </>
                      )}
                      {loan.status === 'repaid' && (
                        <div className="text-sm text-green-600 font-semibold">
                          ✓ Loan Fully Repaid
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredLoans.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No loans found in this category.</p>
              <Link href="/domains">
                <Button className="mt-4">
                  Browse Domains
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoansPage;