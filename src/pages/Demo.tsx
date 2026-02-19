import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';
import { DEMO_PROJECTS, type DemoRole } from '@/data/demoData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OntimeLogo } from '@/components/ui/OntimeLogo';
import {
  HardHat,
  Wrench,
  Users,
  Package,
  ArrowRight,
  ArrowLeft,
  Home,
  Layers,
} from 'lucide-react';

const ROLE_OPTIONS: { role: DemoRole; label: string; description: string; icon: React.ReactNode }[] = [
  { role: 'GC', label: 'General Contractor', description: 'Manage projects, contracts, and billing end-to-end.', icon: <HardHat className="w-8 h-8" /> },
  { role: 'TC', label: 'Trade Contractor', description: 'Price work orders, manage field crews, and submit invoices.', icon: <Wrench className="w-8 h-8" /> },
  { role: 'FC', label: 'Field Crew', description: 'Complete assigned work orders and log hours in the field.', icon: <Users className="w-8 h-8" /> },
  { role: 'SUPPLIER', label: 'Supplier', description: 'Receive purchase orders and enter material pricing.', icon: <Package className="w-8 h-8" /> },
];

import { Building2 } from 'lucide-react';
const PROJECT_ICONS = [<Home className="w-6 h-6" />, <Building2 className="w-6 h-6" />, <Layers className="w-6 h-6" />];

export default function Demo() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<DemoRole | null>(null);
  const { enterDemo } = useDemo();
  const navigate = useNavigate();

  const handleSelectProject = (projectId: string) => {
    if (!selectedRole) return;
    enterDemo(selectedRole, projectId);
    navigate(`/project/${projectId}?tab=overview&demo=true`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>
        <div className="flex items-center gap-2">
          <OntimeLogo className="w-7 h-7" />
          <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">Interactive Demo</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-3xl w-full">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</span>
            <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</span>
          </div>

          {/* Step 1: Choose Role */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-center mb-2">Choose your role</h1>
              <p className="text-muted-foreground text-center mb-8">
                Experience Ontime.Build from the perspective that matches your work.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {ROLE_OPTIONS.map(({ role, label, description, icon }) => (
                  <Card
                    key={role}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedRole === role ? 'ring-2 ring-primary border-primary' : ''}`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${selectedRole === role ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                        {icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{label}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex justify-center mt-8">
                <Button size="lg" disabled={!selectedRole} onClick={() => setStep(2)}>
                  Next: Choose a project <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Choose Project */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-center mb-2">Pick a sample project</h1>
              <p className="text-muted-foreground text-center mb-8">
                These are pre-loaded with realistic data. No real accounts are affected.
              </p>
              <div className="grid gap-4">
                {DEMO_PROJECTS.map((proj, i) => (
                  <Card
                    key={proj.id}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                    onClick={() => handleSelectProject(proj.id)}
                  >
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {PROJECT_ICONS[i]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{proj.name}</h3>
                        <p className="text-sm text-muted-foreground">{proj.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {proj.address.city}, {proj.address.state} · {proj.project_type} · {proj.build_type.replace('_', ' ')}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex justify-center mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 w-4 h-4" /> Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
