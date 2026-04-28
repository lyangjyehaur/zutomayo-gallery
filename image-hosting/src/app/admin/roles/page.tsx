"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function RoleGroupsPage() {
  const [roles, setRoles] = useState([
    { id: 1, name: "Admin", maxUploadSize: "50MB", strategy: "All" },
    { id: 2, name: "Premium", maxUploadSize: "20MB", strategy: "S3 Primary" },
    { id: 3, name: "Free User", maxUploadSize: "5MB", strategy: "Local Fast" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Role Groups</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Role Group
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Configured Role Groups</CardTitle>
          <CardDescription>
            Manage user roles, their upload limits, and assigned storage strategies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Role Name</TableHead>
                <TableHead>Max Upload Size</TableHead>
                <TableHead>Default Strategy</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>{role.id}</TableCell>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.maxUploadSize}</TableCell>
                  <TableCell>{role.strategy}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}