import React from 'react';
import Badge from '../components/Badge';
export default function BadgeDemo() {
  return (
    <div style={{padding: 20}}>
      <h2>Badge Demo</h2>
      <Badge>Default</Badge>
      <div style={{height:8}} />
      <Badge tone="success">Success</Badge>
      <div style={{height:8}} />
      <Badge tone="danger">Danger</Badge>
    </div>
  );
}
