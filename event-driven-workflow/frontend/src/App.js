import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SendEvent from './pages/SendEvent';
import EventsLog from './pages/EventsLog';
import QueueMonitor from './pages/QueueMonitor';
import Analytics from './pages/Analytics';
import DLQManager from './pages/DLQManager';
import Infrastructure from './pages/Infrastructure';
import EC2Manager from './pages/EC2Manager';
import './App.css';

const navItems = [
  { path: '/',              label: '📊 Dashboard'      },
  { path: '/send-event',   label: '📤 Send Event'      },
  { path: '/events-log',   label: '📋 Events Log'      },
  { path: '/queues',       label: '🔄 Queue Monitor'   },
  { path: '/analytics',    label: '📈 Analytics'       },
  { path: '/dlq',          label: '💀 DLQ Manager'     },
  { path: '/infrastructure', label: '🏗️ Infrastructure' },
  { path: '/ec2',          label: '🖥️ EC2 Manager'     },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <nav className="sidebar">
          <div className="sidebar-brand">
            <span className="brand-icon">⚡</span>
            <span className="brand-text">Event Workflow</span>
          </div>
          <ul className="nav-list">
            {navItems.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="sidebar-footer">
            <span>ap-south-1 • Mumbai</span>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/"               element={<Dashboard />} />
            <Route path="/send-event"     element={<SendEvent />} />
            <Route path="/events-log"     element={<EventsLog />} />
            <Route path="/queues"         element={<QueueMonitor />} />
            <Route path="/analytics"      element={<Analytics />} />
            <Route path="/dlq"            element={<DLQManager />} />
            <Route path="/infrastructure" element={<Infrastructure />} />
            <Route path="/ec2"            element={<EC2Manager />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
