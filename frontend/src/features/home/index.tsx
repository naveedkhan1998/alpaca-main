import type React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageActions,
  PageContent,
} from '@/components/PageLayout';
import { Filter, Search, RefreshCw, Radio } from 'lucide-react';
import {
  useDeleteInstrumentMutation,
  useGetSubscribedInstrumentsQuery,
} from '@/api/instrumentService';
import { useStartWebsocketMutation } from '@/api/alpacaService';
import AlpacaStatusCard from '@/components/AlpacaStatusCard';
import InstrumentCard from './components/InstrumentCard';
import { Instrument } from '@/types/common-types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
};

const HomePage: React.FC = () => {
  const { data, refetch } = useGetSubscribedInstrumentsQuery();
  const [deleteInstrument] = useDeleteInstrumentMutation();
  const [startWebsocket] = useStartWebsocketMutation();

  const [deletingRowIds, setDeletingRowIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<'percentage' | 'name'>(
    'percentage'
  );
  const [activeTab, setActiveTab] = useState('all');

  const sortedAndFilteredInstruments = useMemo(() => {
    if (!data?.data) return [];

    let filtered = data.data.filter((instrument: Instrument) =>
      [instrument.exchange_code, instrument.company_name].some(field =>
        field?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    if (activeTab !== 'all') {
      filtered = filtered.filter(
        (instrument: Instrument) =>
          instrument.series === activeTab.toUpperCase()
      );
    }

    return filtered.sort((a: Instrument, b: Instrument) => {
      return sortOption === 'percentage'
        ? (a.percentage?.percentage || 0) - (b.percentage?.percentage || 0)
        : (a.exchange_code || '').localeCompare(b.exchange_code || '');
    });
  }, [data, searchTerm, sortOption, activeTab]);

  const handleDelete = async (id: number) => {
    setDeletingRowIds(prev => [...prev, id]);
    try {
      await deleteInstrument({ id });
      await refetch();
      toast.success('Instrument successfully deleted');
    } catch (error) {
      console.error('Error deleting instrument:', error);
      toast.error('Failed to delete instrument');
    } finally {
      setDeletingRowIds(prev => prev.filter(rowId => rowId !== id));
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        data?.data?.some(
          (instrument: Instrument) => !instrument.percentage?.is_loading
        )
      ) {
        refetch();
      } else {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [data, refetch]);

  return (
    <PageLayout
      header={<PageHeader>Instrument Dashboard</PageHeader>}
      subheader={
        <PageSubHeader>
          Monitor and manage your subscribed instruments in real-time
        </PageSubHeader>
      }
      actions={
        <PageActions>
          <Button
            onClick={refetch}
            variant="outline"
            size="sm"
            className="transition-all duration-200 bg-background/50 hover:bg-accent/50 border-border/50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => startWebsocket()}
            variant="default"
            size="sm"
            className="shadow-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
          >
            <Radio className="w-4 h-4 mr-2" />
            Live Feed
          </Button>
        </PageActions>
      }
    >
      <PageContent>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-6"
        >
          {/* Status Card */}
          <motion.div
            variants={itemVariants}
            className="grid gap-6 mb-8 md:grid-cols-1 lg:grid-cols-1"
          >
            <AlpacaStatusCard />
          </motion.div>

          {/* Enhanced Controls Section */}
          <motion.div variants={itemVariants} className="space-y-4">
            {/* Tabs and Controls */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Enhanced Tabs */}
              <div className="flex flex-col items-start gap-4 md:items-center md:flex-row">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Filter:
                  </span>
                </div>
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full md:w-auto"
                >
                  <TabsList className="border bg-muted/50 border-border/50">
                    <TabsTrigger
                      value="all"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      All
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {data?.data?.length || 0}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                      value="0"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Index
                    </TabsTrigger>
                    <TabsTrigger
                      value="EQ"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Equity
                    </TabsTrigger>
                    <TabsTrigger
                      value="future"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Future
                    </TabsTrigger>
                    <TabsTrigger
                      value="option"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Option
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Enhanced Search and Sort Controls */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative">
                  <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search instruments..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 transition-colors md:w-64 bg-background/50 border-border/50 focus:border-primary/50"
                  />
                </div>

                <Select
                  value={sortOption}
                  onValueChange={value =>
                    setSortOption(value as 'percentage' | 'name')
                  }
                >
                  <SelectTrigger className="w-full md:w-[180px] bg-background/50 border-border/50">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/50">
                    <SelectItem
                      value="percentage"
                      className="flex items-center gap-2"
                    >
                      Percentage
                    </SelectItem>
                    <SelectItem
                      value="name"
                      className="flex items-center gap-2"
                    >
                      Name
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-border/50" />
          </motion.div>

          {/* Instruments Grid */}
          <AnimatePresence mode="wait">
            {data ? (
              <motion.div
                key="instruments-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {sortedAndFilteredInstruments.map(
                  (instrument: Instrument, index: number) => (
                    <motion.div
                      key={instrument.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="h-full"
                    >
                      <InstrumentCard
                        instrument={instrument}
                        onDelete={handleDelete}
                        isDeleting={deletingRowIds.includes(instrument.id)}
                      />
                    </motion.div>
                  )
                )}
              </motion.div>
            ) : (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-64"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 rounded-full border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Loading instruments...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced Empty State */}
          {data && sortedAndFilteredInstruments.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center h-64 p-8 border rounded-lg bg-gradient-to-br from-muted/20 to-muted/10 border-border/50"
            >
              <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-muted/50">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                No instruments found
              </h3>
              <p className="max-w-md text-sm text-center text-muted-foreground">
                Try adjusting your search terms or filter criteria to find the
                instruments you're looking for.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setActiveTab('all');
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </motion.div>
          )}
        </motion.div>
      </PageContent>
    </PageLayout>
  );
};

export default HomePage;
