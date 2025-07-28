import { Button } from '@/components/ui/button';
import { HiArrowLeft, HiChartBar } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

const NotFoundScreen = () => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center h-[100dvh] bg-gradient-to-br from-background via-background to-muted/20">
      <div className="text-center">
        <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-chart-1/10 to-chart-1/20">
          <HiChartBar className="w-10 h-10 text-chart-1" />
        </div>
        <div className="text-xl font-bold text-transparent bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          No Data Available
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Please select an instrument to view detailed charts
        </div>
        <Button onClick={() => navigate(-1)} className="mt-6 action-button">
          <HiArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default NotFoundScreen;
